export function parsePipelineFilterForQuery(stages: string[] | null | undefined): {} | undefined {
  if((stages && typeof stages === 'string') || (Array.isArray(stages) && (stages[0] || (stages.length > 1)))) {
    let value:string | string[]=stages
    if(Array.isArray(stages)){
      stages.forEach((elem:string) =>{
        if (!elem) value=''
      })
      if (value) {
        value=`(${stages.join(') OR (')})`
        const pipelineFilterForQuery = {
          esPropPath: 'stage.key.keyword',
          condition: 'filter',
          value,
        };

        return pipelineFilterForQuery;        
      }
    }
  }
}