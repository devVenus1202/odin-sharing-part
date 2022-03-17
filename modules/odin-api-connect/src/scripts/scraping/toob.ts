import axios from 'axios';
import * as dotenv from 'dotenv';
import 'reflect-metadata';
import { createConnection } from 'typeorm';
import { chunkArray, sleep } from '../../helpers/utilities';

const FormData = require('form-data');
const csv = require('csvtojson')

dotenv.config({ path: '../../../.env' });


async function sync() {

    const pg = await createConnection({
        type: 'postgres',
        host: process.env.DB_HOSTNAME,
        port: Number(process.env.DB_PORT),
        username: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });

    try {
        const csvFilePath = './datafiles/so-postcodes.csv'
        const jsonArray = await csv().fromFile(csvFilePath);

        let remaining = jsonArray.length;
        let imported = 0
        // const batch = chunkArray(jsonArray, 10)

        let postcodes = await pg.query(`
                select distinct(postcode)
                from misc.toob_data_scraping
                where postcode not in (
                    select postcode
                    from misc.toob_data_scraping_searched_postcodes
                )
                order by postcode desc`)
        postcodes = postcodes.map(elem => elem.postcode)
        console.log('postcodes', postcodes.length)

        remaining = postcodes.length;

        const batch = chunkArray(postcodes, 250)

        for(const items of batch) {

            const processAsync = []

            await pg.query(`insert into misc.toob_data_scraping_searched_postcodes(postcode) VALUES (${items.join()})`)

            for(const psotcode of items) {
                console.log('psotcode', psotcode)
                processAsync.push({ func: importAddresses(psotcode, 1, { pg }) })
                remaining -= 1

            }
            const res = await Promise.all(processAsync.map(elem => elem.func))
            console.log('res', res)
            for(const elem of res) {
                imported += elem.imported
            }
            console.log('remaining', remaining)
            console.log('imported', imported)
        }


        process.exit(1)

    } catch (e) {
        console.error(e);
    }
}

/**
 *
 */
async function importAddresses(postcode, page: number, { pg }) {
    let imported = 0
    const formDataPostcode = new FormData();

    formDataPostcode.append('postcode', postcode.replace(' ', ''));
    formDataPostcode.append('pageIndex', page || 1);

    if (page > 0) {
        console.log('postcode', postcode)
        console.log('next page', page)
    }

    await axios({
        method: 'POST',
        url: 'https://www.toob.co.uk/api-interface/api/postcode/',
        data: formDataPostcode,
        headers: formDataPostcode.getHeaders(),
    }).then(async (response) => {
        console.log(response.data.page, response.data.total_pages);
        imported += response.data.formatted_addresses.length;

        if (response.data.formatted_addresses.length > 0) {

            const columns = Object.keys(response.data.formatted_addresses[0]).filter(elem => elem !== 'id')
            const data = []

            for(const elem of response.data.formatted_addresses) {
                delete elem.id
                data.push(elem)
            }

            console.log('data', data.length)

            const insertRes = await pg.manager.createQueryBuilder()
                .insert()
                .into('misc.toob_data_scraping', columns)
                .values(data)
                .onConflict(`("single_line_address") DO NOTHING`)
                .execute();
            console.log('insertRes', insertRes);

            console.log('pages', response.data.total_pages)
            console.log('current page', page)

            if (response.data.total_pages > 1 && response.data.formatted_addresses.length > 0) {
                console.log('PAGINATING', response.data.page)
                await sleep(100)
                await importAddresses(postcode, page + 1, { pg })
            }
        }
    }, (error) => {
        console.log(error);
        process.exit(1)
    });

    return {
        imported,
    }

}

sync();
