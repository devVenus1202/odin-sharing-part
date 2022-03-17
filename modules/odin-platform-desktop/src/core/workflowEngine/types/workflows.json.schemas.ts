import { SchemaEntity } from "@d19n/models/dist/schema-manager/schema/schema.entity"
import { getEntityNamesByModules } from "../../../shared/utilities/schemaHelpers"

export const getWRecordsSelectorFuncJsonSchema = (monaco: any, schemasList: SchemaEntity[]) => ({
  uri: "https://odin/w-records-selector-func-schema.json",
  fileMatch: [monaco.Uri.parse('//RecordSelectorFunc').toString()],
  schema: {
    type: "object",
    properties: {
      fn: {
        description: "the only supported records selector function is 'dbQuery'",
        const: "dbQuery"
      },
      params: {
        type: "object",
        properties: {
          moduleName: {
            enum: [...new Set(getEntityNamesByModules(schemasList)?.map(item => item[0]))]
          },
          entityName: {
            enum: getEntityNamesByModules(schemasList)?.map(item => item[1])
          },
          condition: {
            description: "the condition string in the Odin condition sytax \n(see: Odin workflows handbook / How to create workflow / How to define the RecordSelectorFunc / dbQuery)",
            type: "string"
          },
          rawSql: {
            description: "the raw select sql query with replaced \" char on `",
            type: "string"
          },
          withDeleted: {
            description: "true - retrieve deleted records\nfalse (default) - do not retrieve deleted records",
            type: "boolean"
          }
        }
      }
    },
    required: ["fn", "params"]
  }
})

export const getWFunctionJsonSchema = (schemasList: SchemaEntity[]) => ({
  uri: "https://odin/w-function-schema.json",
  schema: {
    type: "object",
    properties: {
      fn: {
        description: "function name",
        enum: ["exception", "calculateTotals", "sendEmail", "sendCsv", "updateRecord", "createRecord", "flatChildren",
          "validateDbQueryRawSql"
        ]
      },
    },
    required: ["fn"],
    if: { properties: { fn: { const: "exception" }} },
    then: {
      properties: {
        params: {
          type: "object",
          properties: {
            code: { type: "integer" },
            msg: { type: "string" }
          },
          required: ["code", "msg"]
        }
      },
      required: ["params"]
    },
    else: {
      if: { properties: { fn: { const: "calculateTotals" }} },
      then: {
        properties: {
          params: {
            type: "object",
            properties: {
              onDate: {
                description: "the date on that the billing period should be calculated",
                type: "string",
                pattern: "^\\d{4}\\-(0?[1-9]|1[012])\\-(0?[1-9]|[12][0-9]|3[01])$"
              }
            }
          }
        }
      },
      else: {
        if: { properties: { fn: { const: "sendEmail" }} },
        then: {
          properties: {
            params: {
              type: "object",
              properties: {
                to: {
                  description: "eg: \"addr1@mail.test; addr2@mail.test\"",
                  type: "string"
                },
                subject: { type: "string" },
                body: {
                  description: "use '\\n' to add a new line",
                  type: "string"
                }
              },
              required: ["to", "subject", "body"]
            }
          },
          required: ["params"]
        },
        else: {
          if: { properties: { fn: { const: "sendCsv" }} },
          then: {
            properties: {
              params: {
                type: "object",
                properties: {
                  to: {
                    description: "eg: \"addr1@mail.test; addr2@mail.test\"",
                    type: "string"
                  },
                  subject: { type: "string" },
                  body: {
                    description: "use '\\n' to add a new line",
                    type: "string"
                  },
                  csvFields: {
                    description: "keys - fields labels; values - operand expressions \n(see: Odin workflows handbook / Odin condition syntax / Supported operand expression types)",
                    type: "object",
                  }
                },
                required: ["to", "subject", "body", "csvFields"]
              }
            },
            required: ["params"]
          },
          else: {
            if: { properties: { fn: { const: "updateRecord" }} },
            then: {
              properties: {
                params: {
                  type: "object",
                  properties: {
                    entityName: {
                      description: "required when updating the related entity, \neg the WorkOrder related to the Address",
                      enum: getEntityNamesByModules(schemasList)?.map(item => item[1])
                    },
                    title: { type: "string" },
                    stageKey: {
                      description: "eg WorkOrderDone",
                      type: "string"
                    },
                    stageUpdatedAt: {
                      description: "date string in YYYY-MM-DD format",
                      type: "string"
                    },
                    groups: {
                      description: "names of groups to replace existing",
                      type: "array",
                      items: { type: "string" }
                    },
                    addGroups: {
                      description: "names of groups to add to existing",
                      type: "array",
                      items: { type: "string" }
                    },
                    removeGroups: {
                      description: "names of groups to remove from existing",
                      type: "array",
                      items: { type: "string" }
                    },
                    properties: {
                      description: "entity properties names and values",
                      type: "object"
                    },
                    associations: {
                      description: "records ids to create relations",
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          recordId: { type: "string" }
                        },
                        required: ["recordId"]
                      }
                    }
                  }
                }
              },
              required: ["params"]
            },
            else: {
              if: { properties: { fn: { const: "flatChildren" }} },
              then: {
                properties: {
                  params: {
                    type: "object",
                    properties: {
                      entityName: {
                        description: "Gets all related records by specified entityName and flat them into single array",
                        enum: getEntityNamesByModules(schemasList)?.map(item => item[1])
                      }
                    },
                    required: ["entityName"]
                  }
                },
                required: ["params"]
              },
              else: {
                if: { properties: { fn: { const: "createRecord" }} },
                then: {
                  properties: {
                    params: {
                      type: "object",
                      properties: {
                        entity: {
                          description: "{moduleName}:{entityName}",
                          type: "string",
                        },
                        type: { type: "string" },
                        title: { type: "string" },
                        stageKey: {
                          description: "eg WorkOrderDone",
                          type: "string"
                        },
                        stageUpdatedAt: {
                          description: "date string in YYYY-MM-DD format",
                          type: "string"
                        },
                        groups: {
                          description: "names of groups to replace existing",
                          type: "array",
                          items: { type: "string" }
                        },
                        properties: {
                          description: "entity properties names and values",
                          type: "object"
                        },
                        associations: {
                          description: "records ids to create relations",
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              recordId: { type: "string" }
                            },
                            required: ["recordId"]
                          }
                        }
                      }
                    }
                  },
                  required: ["params"]
                },
                else: {
                  properties: {
                    params: {
                      description: "function params",
                      type: "object"
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
})

export const wActivityActionJsonSchema = {
  uri: "https://odin/w-activity-action-schema.json",
  schema: {
    allOf: [{ $ref:"https://odin/w-function-schema.json" }],
    properties: {
      exec: {
        description: "'each' - the function will be executed for each record separately;\n'all' (default) - the function will be executed for all records at once.",
        enum: ["each", "all"]
      }
    }
  }
}

export const wActivityIfElseJsonSchema = {
  uri: "https://odin/w-activity-if-else-schema.json",
  schema: {
    type: "object",
    properties: {
      if: {
        description: "the condition string in the Odin condition syntax (see: Odin workflows handbook / Odin condition syntax)",
        type: "string"
      },
      then: {
        $ref:"https://odin/w-activity-schema.json" 
      },
      else: {
        $ref:"https://odin/w-activity-schema.json"
      }
    },
    required: ["if", "then"]
  }
}

export const wActivitySequenceJsonSchema = {
  uri: "https://odin/w-activity-sequence-schema.json",
  schema: {
    type: "object",
    properties: {
      sequence: {
        description: "executes activities sequentially",
        type: "array",
        items: {
          $ref:"https://odin/w-activity-schema.json" 
        }
      }
    },
    required: ["sequence"]
  }
}

export const getWActivityJsonSchema = (monaco: any) => ({
  uri: "https://odin/w-activity-schema.json",
  fileMatch: [monaco.Uri.parse('//Activity').toString()],
  schema: {
    description: "activity definition",
    anyOf: [
      { $ref:"https://odin/w-activity-action-schema.json" },
      { $ref:"https://odin/w-activity-if-else-schema.json" },
      { $ref:"https://odin/w-activity-sequence-schema.json" },
    ]
  }
})