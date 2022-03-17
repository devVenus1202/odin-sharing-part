export class DataTypesUtils {
  /**
   * ODN-1756 Parses a boolean value considering the 'FALSE' string as a false value (case insensitive)
   * 
   * @param value 
   * @returns 
   */
  public static parseBoolean(value: any): boolean {
    let boolValue: boolean;
    if (!value) {
      boolValue = false;
    } else if (typeof (value) === 'boolean') {
      boolValue = value;
    } else if (typeof (value) === 'string' && value.toLowerCase().trim() === 'false') {
      boolValue = false;
    } else {
      boolValue = true;
    }
    return boolValue;
  }

  /**
   * ODN-1756 Trims specified leading and trailing substrings from the original string
   * 
   * @param originalStr 
   * @param leadingSubStr 
   * @param trailingSubStr 
   * @returns 
   */
  public static trimString(originalStr: string, leadingSubStr: string, trailingSubStr: string, caseInsensitive?: boolean): string {
    if (!originalStr) return originalStr;

    let res = originalStr;

    let pOrigStr = caseInsensitive ? res.toLowerCase() : res;
    const pLeadingSubstr = caseInsensitive ? leadingSubStr?.toLowerCase() : leadingSubStr;
    const pTrailingSubstr = caseInsensitive ? trailingSubStr?.toLowerCase() : trailingSubStr;

    if (pLeadingSubstr && pOrigStr.startsWith(pLeadingSubstr)) {
      res = res.substr(pOrigStr.indexOf(pLeadingSubstr) + pLeadingSubstr.length);
    }

    pOrigStr = caseInsensitive ? res.toLowerCase() : res;
    if (pTrailingSubstr && pOrigStr.endsWith(pTrailingSubstr)) {
      res = res.substr(0, pOrigStr.lastIndexOf(pTrailingSubstr));
    }

    return res;
  }

  /**
   * ODN-1756 Escapes the regex special characters in the string
   * 
   * @param str 
   * @returns 
   */
  public static escapeRegex(str: string): string {
    return str?.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  }
}