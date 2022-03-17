#!/bin/sh

#DB_HOSTNAME=odin-dev-2.c0bfvabolc0x.us-east-1.rds.amazonaws.com
#DB_PORT=5432
#DB_USERNAME=postgres
#DB_PASSWORD=QSe0m1VTXeAUou9L
#DB_NAME=odin

#DB_HOSTNAME=odin-prod-3.cvleggfozj2t.eu-west-2.rds.amazonaws.com
#DB_PORT=5432
#DB_USERNAME=postgres
#DB_PASSWORD=POonl3ZGe3uvuMcmvphgFoIzQs
#DB_NAME=odin

DB_HOSTNAME=cosmos0001.chbucothrs1f.eu-west-2.rds.amazonaws.com
DB_PORT=5432
DB_USERNAME=poem
DB_PASSWORD=Jie04hvfni3dfj59Jdn1
DB_NAME=cosmos


psql -h $DB_HOSTNAME -U $DB_USERNAME $DB_NAME << EOF

DROP TABLE IF EXISTS royal_mail.paf;

CREATE SCHEMA IF NOT EXISTS royal_mail AUTHORIZATION poem;

CREATE TABLE royal_mail.paf
(
    id SERIAL PRIMARY KEY,
    postcode VARCHAR,
    posttown VARCHAR,
    dependent_locality VARCHAR,
    double_dependent_locality VARCHAR,
    thoroughfare_and_descriptor VARCHAR,
    dependent_thoroughfare_and_descriptor VARCHAR,
    building_number VARCHAR,
    building_name VARCHAR,
    sub_building_name VARCHAR,
    po_box VARCHAR,
    department_name VARCHAR,
    organization_name VARCHAR,
    udprn INTEGER,
    postcode_type VARCHAR,
    su_organization_indicator VARCHAR,
    delivery_point_suffix VARCHAR,
    address_key VARCHAR,
    organization_key VARCHAR,
    number_of_households VARCHAR,
    locality_key VARCHAR
);

ALTER TABLE royal_mail.paf OWNER to poem;

DROP INDEX IF EXISTS paf_postcode_idx;
CREATE INDEX IF NOT EXISTS paf_postcode_idx ON royal_mail.paf (postcode);

DROP INDEX IF EXISTS paf_udprn_idx;
CREATE INDEX IF NOT EXISTS paf_udprn_idx ON royal_mail.paf (udprn);

\copy royal_mail.paf (postcode, \
    posttown, \
    dependent_locality, \
    double_dependent_locality, \
    thoroughfare_and_descriptor, \
    dependent_thoroughfare_and_descriptor, \
    building_number, \
    building_name, \
    sub_building_name, \
    po_box, \
    department_name, \
    organization_name, \
    udprn, \
    postcode_type, \
    su_organization_indicator, \
    delivery_point_suffix, \
    address_key, \
    organization_key, \
    number_of_households, \
    locality_key \
) from ~/Desktop/royal_mail_paf_utf8.txt WITH (FORMAT csv,DELIMITER ',');

EOF

#) from ~/Desktop/royal_mail_paf.csv WITH (FORMAT csv,DELIMITER ',', encoding 'windows-1251');

## Check file encoding
# file  ~/Desktop/Y20M05/CSV_PAF/CSV_PAF.csv
# /Users/franktruglio/Desktop/Y20M05/CSV_PAF/CSV_PAF.csv: ASCII text, with CRLF line terminators

