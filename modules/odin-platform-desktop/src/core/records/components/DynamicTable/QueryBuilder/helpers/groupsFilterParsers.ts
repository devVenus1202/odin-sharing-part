export function parseGroupsFilterForQuery(values: string[] | null | undefined): {} | undefined {
  if((values && typeof values === 'string') || (Array.isArray(values) && values.length > 0)) {
    let value: string | string[] = values;
    if(Array.isArray(values)) {
      values.forEach((elem: string) => {
        if (!elem) value='';
      });
      if (value) {
        value=`(${values.join(') OR (')})`;
        const filterForQuery = {
          esPropPath: 'groups.id.keyword',
          condition: 'filter',
          value,
        };

        return filterForQuery;        
      }
    }
  }
}