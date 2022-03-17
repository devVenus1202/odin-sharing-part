import moment from 'moment';
import dayjs from 'dayjs';

/**
 * Just tries to parse date in different input formats
 * @param date 
 * @returns 
 */
function parseDate(date: string | Date | undefined): moment.Moment {
  let parsedDate = moment(date);
  if (!parsedDate.isValid()) {
    parsedDate = moment(date, 'MM-YYYY');
  }
  return parsedDate;
}

/**
 * @param date
 * @returns 01 June 2020
 */
export function parseDateForNoteFeed(date: string | Date | undefined) {
  const parsedDate = parseDate(date);
  if (parsedDate.isValid()) {
    return parsedDate.format('DD MMMM YYYY');
  }
}

/**
 * @param date
 * @returns 01/06/2020
 */
export function parseDateToLocalFormat(date: string | Date | undefined) {
  const parsedDate = parseDate(date);
  if (parsedDate.isValid()) {
    return parsedDate.format('DD/MM/YYYY');
  }
}

/**
 * @param date
 * @returns "Sunday, February 14th 2010, 3:25:50 pm"
 */
export function parseDateAndTimeLocal(date: string | Date | undefined) {
  const parsedDate = parseDate(date);
  if (parsedDate.isValid()) {
    return parsedDate.format('dddd, MMMM Do YYYY, h:mm:ss a');
  }
}

/**
 * @param date
 * @returns "04/09/1986 8:30:00 PM"
 */
export function parseDateLocalizedHoursAndSeconds(date: string | Date | undefined) {
  const parsedDate = parseDate(date);
  if (parsedDate.isValid()) {
    return parsedDate.format('DD/MM/YYYY LTS');
  }
}

/**
 * @param date
 * @returns "04/09/1986 8:30:00 PM"
 */
export function parseDateLocalizedHours(date: string | Date | undefined) {
  const parsedDate = parseDate(date);
  if (parsedDate.isValid()) {
    return parsedDate.format('DD/MM/YYYY LT');
  }
}

/**
 * 
 * @param date 
 * @returns day number in month
 */
export function parseDateDay(date: string | Date | undefined, format?: string): number | undefined {
  const parsedDate = format ? dayjs(date, format) : dayjs(date);
  if (date && parsedDate.isValid()) {
    return parsedDate.date();
  }
}

/**
 * 
 * @param date 
 * @returns day number in month
 */
 export function parseAdjustedDateDay(date: string | Date | undefined, maxDay: number, format?: string): number {
  const parsedDay = Number(parseDateDay(date, format));
  return Number.isNaN(parsedDay) || parsedDay <= maxDay ? parsedDay : maxDay;
}



const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];


function getFormattedDate(date:any, prefomattedDate:any, hideYear = false) {
  let minutes = date.getMinutes();

  if (minutes < 10) {
    // Adding leading zero to minutes
    minutes = `0${ minutes }`;
  }

  if (prefomattedDate) {
    return `${ prefomattedDate }`;
  }
  if (hideYear) {
    return moment(date).format("DD MMM");
  }
  return moment(date).format("DD MMM YYYY");
}


// --- Main function
export function timeAgo(dateParam:any) {
  if (!dateParam) {
    return null;
  }

  const date = typeof dateParam === 'object' ? dateParam : new Date(dateParam);
  const DAY_IN_MS = 86400000; // 24 * 60 * 60 * 1000
  const today = new Date();
  const yesterday = new Date(today.getTime() - DAY_IN_MS);
  const seconds = Math.round((today.getTime() - date.getTime()) / 1000);
  const minutes = Math.round(seconds / 60);
  const hours = Math.round(minutes / 60);
  const isToday = today.toDateString() === date.toDateString();
  const isYesterday = yesterday.toDateString() === date.toDateString();
  const isThisYear = today.getFullYear() === date.getFullYear();

  if (seconds < 5) {
    return 'now';
  } else if (seconds < 60) {
    return `${ seconds } seconds ago`;
  } else if (seconds < 90) {
    return 'about a minute ago';
  } else if (minutes < 60) {
    return `${ minutes } minutes ago`;
  } else if (hours < 12) {
    return `${hours} hours ago`;
  } else if (isToday) {
    return getFormattedDate(date, 'Today'); // Today at 10:20
  } else if (isYesterday) {
    return getFormattedDate(date, 'Yesterday'); // Yesterday at 10:20
  } else if (isThisYear) {
    return getFormattedDate(date, false, true); // 10. January at 10:20
  }

  return getFormattedDate(date, null, false); // 10. January 2017. at 10:20
}