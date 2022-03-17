import { SchemaEntity } from '@d19n/models/dist/schema-manager/schema/schema.entity';
import { getSchemaFromShortListBySchemaId } from '../../../shared/utilities/schemaHelpers';
import { ISchemaById } from '../../schemas/store/actions';

export enum OperatorsNamesEnum {
  IS_EQUAL_TO_L = 'IS EQUAL TO',
  IS_EQUAL_TO_S = '==',
  IS_NOT_EQUAL_TO_L = 'IS NOT EQUAL TO',
  IS_NOT_EQUAL_TO_S = '!=',
  IS_NOT_GREATER_THAN_L = 'IS NOT GREATER THAN',
  IS_NOT_GREATER_THAN_S = '<=',
  IS_LESS_THAN_L = 'IS LESS THAN',
  IS_LESS_THAN_S = '<',
  IS_NOT_LESS_THAN_L = 'IS NOT LESS THAN',
  IS_NOT_LESS_THAN_S = '>=',
  IS_GREATER_THAN_L = 'IS GREATER THAN',
  IS_GREATER_THAN_S = '>',
  IS_TRUE = 'IS TRUE',
  IS_FALSE = 'IS FALSE',
  IS_NULL = 'IS NULL',
  IS_NOT_NULL = 'IS NOT NULL',
  NOT_CONTAINS = 'NOT CONTAINS',
  CONTAINS = 'CONTAINS',
  NOT_IN = 'NOT IN',
  IN = 'IN',
}

class OdinSyntaxCompletionContext {

  bracketsStack: string[] = [];
  closingBracketRequired?: boolean;

  conditionsGroupsUntil?: string;
  boolOpUntil?: string;
  groupOpenBracketUntil?: string;
  spaceUntil?: string;
  insideConditionGroup?: boolean;

  nextIsSubCondition?: boolean;

  constructor(
    public wordUntilPosition: { word: string },
    public range: {
      startLineNumber: number;
      endLineNumber: number;
      startColumn: number;
      endColumn: number;
    },
  ) { }
}

export class OdinSyntaxCompletionItemProvider {

  private operatorsKeyWords = [
    [OperatorsNamesEnum.IS_EQUAL_TO_L, /\s+IS\s+EQUAL\s+TO\s+/gi],
    [OperatorsNamesEnum.IS_EQUAL_TO_S, /\s*==\s*/gi],
    [OperatorsNamesEnum.IS_NOT_EQUAL_TO_L, /\s+IS\s+NOT\s+EQUAL\s+TO\s+/gi],
    [OperatorsNamesEnum.IS_NOT_EQUAL_TO_S, /\s*!=\s*/gi],
    [OperatorsNamesEnum.IS_NOT_GREATER_THAN_L, /\s+IS\s+NOT\s+GREATER\s+THAN\s+/gi],
    [OperatorsNamesEnum.IS_NOT_GREATER_THAN_S, /\s*<=\s*/gi],
    [OperatorsNamesEnum.IS_LESS_THAN_L, /\s+IS\s+LESS\s+THAN\s+/gi],
    [OperatorsNamesEnum.IS_LESS_THAN_S, /\s*<\s*/gi],
    [OperatorsNamesEnum.IS_NOT_LESS_THAN_L, /\s+IS\s+NOT\s+LESS\s+THAN\s+/gi],
    [OperatorsNamesEnum.IS_NOT_LESS_THAN_S, /\s*>=\s*/gi],
    [OperatorsNamesEnum.IS_GREATER_THAN_L, /\s+IS\s+GREATER\s+THAN\s+/gi],
    [OperatorsNamesEnum.IS_GREATER_THAN_S, /\s*>\s*/gi],
    [OperatorsNamesEnum.IS_TRUE, /\s+IS\s+TRUE\s*/gi],
    [OperatorsNamesEnum.IS_FALSE, /\s+IS\s+FALSE\s*/gi],
    [OperatorsNamesEnum.IS_NOT_NULL, /\s+IS\s+NOT\s+NULL\s*/gi],
    [OperatorsNamesEnum.IS_NULL, /\s+IS\s+NULL\s*/gi],
    [OperatorsNamesEnum.NOT_CONTAINS, /\s+NOT\s+CONTAINS\s+/gi],
    [OperatorsNamesEnum.CONTAINS, /\s+CONTAINS\s+/gi],
    [OperatorsNamesEnum.NOT_IN, /\s+NOT\s+IN\s+/gi],
    [OperatorsNamesEnum.IN, /\s+IN\s+/gi],
  ];


  public constructor(
    private readonly schemasList: SchemaEntity[],
    private readonly schemasShortList: { [key: string]: SchemaEntity },
    private getSchema: (payload: ISchemaById, cb?: any) => void,
  ) { }


  public provideCompletionItems(model: any, position: any) {

    const suggestions: any[] = [];

    const completionContext = new OdinSyntaxCompletionContext(
      model.getWordUntilPosition(position),
      {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: position.column,
        endColumn: position.column
      }
    );

    const textUntilPosition = model.getValueInRange({
      startLineNumber: 1,
      startColumn: 1,
      endLineNumber: position.lineNumber,
      endColumn: position.column
    });

    // suggest condition
    const matchConditionExp = textUntilPosition.match(
      /("if"|"condition")\s*:\s*"(([^"]|\\")*)$/i
    );
    if (matchConditionExp) {
      this.suggestCondition(matchConditionExp[2], suggestions, completionContext)

    } else {
      // suggest function param
      const matchFuncParamExp = textUntilPosition.match(
        /"fn"\s*:\s*".+"\s*,\s*"params"\s*:\s*{(?:[^}]*|[^{}]*{[^{}]*}[^{}]*)".*"\s*:\s*"(.*)$/i
      )
      if (matchFuncParamExp) {
        this.suggestFuncParam(matchFuncParamExp[1], suggestions, completionContext);
      }
    }

    return { suggestions };
  }


  private addSuggestion(
    completionContext: OdinSyntaxCompletionContext,
    suggestions: any[],
    kind: number,
    label: string,
    insertText: string,
    autoAppendSpaceBefore = true,
    isSnippet = false,
  ) {
    const suggestion: any = {
      label,
      kind,
      insertText: `${autoAppendSpaceBefore && completionContext.wordUntilPosition.word !== '' ? ' ' : ''}${insertText}`,
      range: {
        replace: completionContext.range,
        insert: completionContext.range,
      }
    };
    if (isSnippet) suggestion.insertTextRules = 4;
    suggestions.push(suggestion);
  }


  private suggestCondition(
    conditionExp: string,
    suggestions: any[],
    completionContext: OdinSyntaxCompletionContext,
  ) {

    if (conditionExp === undefined) return;

    // count backets
    for (const c of conditionExp) {
      if (c === '(') completionContext.bracketsStack.push('(');
      else if (c === ')') completionContext.bracketsStack.pop();
    }
    completionContext.closingBracketRequired = completionContext.bracketsStack.length > 0;

    // detect conditions groups
    const matchConditionsGroupsUntil = conditionExp.match(
      /^(\s*\(.*\))(\s*(AND|OR))?(\s*\()?(\s)*$/i
    );
    completionContext.conditionsGroupsUntil = matchConditionsGroupsUntil?.[1];
    completionContext.boolOpUntil = matchConditionsGroupsUntil?.[3];
    completionContext.groupOpenBracketUntil = matchConditionsGroupsUntil?.[4];
    completionContext.spaceUntil = matchConditionsGroupsUntil?.[5];

    // this is not a condition group if brackets are not closed
    if (completionContext.conditionsGroupsUntil && completionContext.bracketsStack.length > 0 && !completionContext.groupOpenBracketUntil) {
      completionContext.conditionsGroupsUntil = undefined;
    }

    if (!completionContext.conditionsGroupsUntil) {
      // detect bool operator
      const matchBoolOpUntil = conditionExp.match(
        /(?:\s+|\))(AND|OR)(\s)*$/i
      );
      completionContext.boolOpUntil = matchBoolOpUntil?.[1];
      completionContext.spaceUntil = matchBoolOpUntil?.[2];
    }

    if (completionContext.conditionsGroupsUntil) {
      if (!completionContext.boolOpUntil) {
        // suggest bool operator
        this.suggestBoolOperators(completionContext, suggestions);

      } else if (!completionContext.groupOpenBracketUntil) {
        if (completionContext.bracketsStack.length === 0) {
          // suggest next group open bracket
          this.addSuggestion(completionContext, suggestions, 27, '(', '(');
        }

      } else {
        completionContext.nextIsSubCondition = true;
      }

    } else if (completionContext.boolOpUntil) {
      completionContext.nextIsSubCondition = true;
      completionContext.closingBracketRequired = false;

    } else {
      completionContext.nextIsSubCondition = true;
    }

    if (completionContext.nextIsSubCondition) {

      // detect sub condition
      const trimmedLeftConditionExp = conditionExp.trimLeft();
      const matchSubCondExp = trimmedLeftConditionExp.match(
        /(^|^\(|(?:(?:(?:\s+|\))AND|(?:\s+|\))OR)\s*\(?))\s*((?:(?!(?:^\(|(?:AND|OR)(?:\s?\(|\s+))).)*?)$/i
      );
      completionContext.insideConditionGroup = !!matchSubCondExp?.[1] && matchSubCondExp[1].indexOf('(') > -1;
      const subCondExp = matchSubCondExp?.[2] || '';

      // parse entered sub condition
      const normalizedExp = subCondExp.replace(/\s\s+/g, ' ');
      let {
        opName,
        left,
        right
      } = this.tryFindOperatorAndSplitCondition(normalizedExp);

      if (!opName) {
        // if no operator then parse left operand and check if it is complete
        this.suggestOperand(left, suggestions, completionContext, 'CONDITION_OPERATOR');

      } else {
        // contains minumum "{leftOperand} {operator}"
        // if operator exists then parse right part
        this.suggestOperand(right, suggestions, completionContext, 'BOOL_OPERATOR');
      }
    }

    // suggest closing ')'
    if (completionContext.closingBracketRequired) this.addSuggestion(completionContext, suggestions, 27, ')', ') ', false);
  }

  private tryFindOperatorAndSplitCondition(exp: string): { opName?: string; opRegExp?: RegExp; left: string; right?: string; } {
    let opName: string;
    let opRegExp: RegExp;

    for (const opKW of this.operatorsKeyWords) {
      opName = opKW[0] as string;
      opRegExp = opKW[1] as RegExp;

      const splitted = exp.split(opRegExp);
      if (splitted.length == 1) continue;

      return {
        opName,
        opRegExp,
        left: splitted[0].trim(),
        right: splitted[1],
      }
    }

    return {
      opName: undefined,
      opRegExp: undefined,
      left: exp,
      right: undefined
    }
  }


  private suggestFuncParam(
    paramExp: string,
    suggestions: any[],
    completionContext: OdinSyntaxCompletionContext,
  ) {
    // todo: implement function param completion
  }


  private suggestOperand(
    operandExp: string | undefined,
    suggestions: any[],
    completionContext: OdinSyntaxCompletionContext,
    afterOperand: 'CONDITION_OPERATOR' | 'BOOL_OPERATOR',
  ) {

    if (!operandExp) {
      // suggest new operand
      this.addSuggestion(completionContext, suggestions, 4, 'principal', 'principal:');
      this.addSuggestion(completionContext, suggestions, 17, 'func', 'func:');
      this.suggestDateMath(completionContext, suggestions);
      this.suggestEntitiesNames(completionContext, suggestions);

      // additional keywords
      this.addSuggestion(completionContext, suggestions, 4, 'dbRecordUrl', 'dbRecordUrl');

      completionContext.closingBracketRequired = false;
      return;
    }

    const trimmedLeftOperandExp = operandExp.trimLeft();
    const splitted = trimmedLeftOperandExp.split(':');

    const leftKeyword = splitted[0].trim().toLowerCase();

    const isFunc = leftKeyword === 'func';
    const isPrincipalProperty = leftKeyword === 'principal';
    const isEntity = this.schemasList?.some(schema => schema.entityName.toLowerCase() === leftKeyword);

    if (splitted.length === 1 || splitted[1]) {
      // contains "leftKey" or "leftKey:rightKey"
      if (splitted.length === 1 && (isFunc || isPrincipalProperty || isEntity)) {
        // suggest ':'
        this.addSuggestion(completionContext, suggestions, 27, ':', ':', false);
        completionContext.closingBracketRequired = false;

      } else {

        if (completionContext.bracketsStack.length === 0
          || completionContext.insideConditionGroup && completionContext.bracketsStack.length < 2
        ) {
          // have no open brackets inside the group
          if (afterOperand === 'CONDITION_OPERATOR')
          {
            // suggest condition operators
            this.suggestConditionOperators(completionContext, suggestions);
            completionContext.closingBracketRequired = false;

          } else {
            // suggest bool operators
            this.suggestBoolOperators(completionContext, suggestions);
          }
        }
      }
    } else {
      // contains only "leftKey:"
      if (isFunc) {
        // suggest functions
        this.suggestFunctions(completionContext, suggestions);
      } else if (isPrincipalProperty) {
        // suggest principal properties
        this.suggestPrincipalProperties(completionContext, suggestions);

      } else if (isEntity) {
        // suggest entity properties
        this.suggestEntityProperties(completionContext, suggestions, leftKeyword);
      }
      completionContext.closingBracketRequired = false;
    }
  }

  private suggestBoolOperators(
    completionContext: OdinSyntaxCompletionContext,
    suggestions: any[],
  ) {
    this.addSuggestion(completionContext, suggestions, 11, 'AND', 'AND ');
    this.addSuggestion(completionContext, suggestions, 11, 'OR', 'OR ');
  }

  private suggestConditionOperators(
    completionContext: OdinSyntaxCompletionContext,
    suggestions: any[],
  ) {
    Object.values(OperatorsNamesEnum).forEach(val => this.addSuggestion(completionContext, suggestions, 11, val, `${val} `));
  }

  private suggestDateMath(
    completionContext: OdinSyntaxCompletionContext,
    suggestions: any[],
  ) {
    this.addSuggestion(
      completionContext, suggestions, 13,
      "now() +/- interval 'N day|week|month|year'",
      "now() ${1:+/-} interval '${2:N} ${3:day|week|month|year}' ",
      true, true,
    );
    this.addSuggestion(
      completionContext, suggestions, 13,
      "today() +/- interval 'N day|week|month|year'",
      "today() ${1:+/-} interval '${2:N} ${3:day|week|month|year}' ",
      true, true,
    );
  }

  private suggestEntitiesNames(
    completionContext: OdinSyntaxCompletionContext,
    suggestions: any[],
  ) {
    this.schemasList?.forEach(schema => this.addSuggestion(
      completionContext, suggestions, 4,
      schema.entityName,
      `${schema.entityName}:`,
    ));
  }

  private suggestEntityProperties(
    completionContext: OdinSyntaxCompletionContext,
    suggestions: any[],
    lowerEntityName: string,
  ) {

    this.addSuggestion(completionContext, suggestions, 9, 'Stage', 'Stage ', false);
    this.addSuggestion(completionContext, suggestions, 9, 'StageUpdated', 'StageUpdated ', false);
    this.addSuggestion(completionContext, suggestions, 9, 'StageUpdated.Date', 'StageUpdated.Date ', false);
    this.addSuggestion(completionContext, suggestions, 9, 'Created', 'Created ', false);
    this.addSuggestion(completionContext, suggestions, 9, 'Created.Date', 'Created.Date ', false);
    this.addSuggestion(completionContext, suggestions, 9, 'Updated', 'Updated ', false);
    this.addSuggestion(completionContext, suggestions, 9, 'Updated.Date', 'Updated.Date ', false);
    this.addSuggestion(completionContext, suggestions, 9, 'RecordNumber', 'RecordNumber ', false);
    this.addSuggestion(completionContext, suggestions, 9, 'EntityType', 'EntityType ', false);
    this.addSuggestion(completionContext, suggestions, 9, 'LastModifiedBy', 'LastModifiedBy ', false);
    this.addSuggestion(completionContext, suggestions, 9, 'LastModifiedBy.id', 'LastModifiedBy.id ', false);
    this.addSuggestion(completionContext, suggestions, 9, 'CreatedBy', 'CreatedBy ', false);
    this.addSuggestion(completionContext, suggestions, 9, 'CreatedBy.id', 'CreatedBy.id ', false);
    this.addSuggestion(completionContext, suggestions, 9, 'OwnedBy', 'OwnedBy ', false);
    this.addSuggestion(completionContext, suggestions, 9, 'OwnedBy.id', 'OwnedBy.id ', false);
    this.addSuggestion(completionContext, suggestions, 9, 'Title', 'Title ', false);
    this.addSuggestion(completionContext, suggestions, 9, 'Id', 'Id ', false);
    this.addSuggestion(completionContext, suggestions, 9, 'Groups', 'Groups ', false);
    this.addSuggestion(completionContext, suggestions, 9, 'Groups.full', 'Groups.full ', false);
    this.addSuggestion(completionContext, suggestions, 9, 'Url', 'Url ', false);

    const schemaWithoutColumns = this.schemasList?.find(schema => schema.entityName.toLowerCase() === lowerEntityName);
    if (schemaWithoutColumns?.id) {
      const schema = getSchemaFromShortListBySchemaId(this.schemasShortList, schemaWithoutColumns.id);
      if (schema) {
        schema.columns.forEach(column => this.addSuggestion(
          completionContext, suggestions, 9,
          column.name,
          `${column.name} `, false
        ));
      } else {
        this.getSchema({ schemaId: schemaWithoutColumns.id }, (schemaRes: SchemaEntity) => {
          if (schemaRes?.id) this.schemasShortList[schemaRes.id] = schemaRes;
        });
        this.addSuggestion(completionContext, suggestions, 9, 'loading schema, try again in a few secods...', '', false);
      }
    }
  }

  private suggestPrincipalProperties(
    completionContext: OdinSyntaxCompletionContext,
    suggestions: any[],
  ) {
    this.addSuggestion(completionContext, suggestions, 9, 'roles', 'roles ', false);
    this.addSuggestion(completionContext, suggestions, 9, 'permissions', 'permissions ', false);
  }

  private suggestFunctions(
    completionContext: OdinSyntaxCompletionContext,
    suggestions: any[],
  ) {
    this.addSuggestion(
      completionContext, suggestions, 1,
      "diffDate(from, to, units)",
      "diffDate('${1:from='YYYY-MM-DD'}', '${2:to='YYYY-MM-DD'}', '${3:units: 'day'|'week'|'month'|'year'}') ",
      false, true,
    );
    this.addSuggestion(
      completionContext, suggestions, 1,
      "formatDate(date, format)",
      "formatDate('${1:date='YYYY-MM-DD'}', '${2:format='DD/MM/YYYY'}') ",
      false, true,
    );
    this.addSuggestion(
      completionContext, suggestions, 1,
      "joinData(data, separator)",
      "joinData(${1:data: any[]}, '${2:separator: string}') ",
      false, true,
    );
    this.addSuggestion(
      completionContext, suggestions, 1,
      "joinData(data, separator, surroundWith)",
      "joinData(${1:data: any[]}, '${2:separator: string}', '${3:surroundWith: string}') ",
      false, true,
    );
    this.addSuggestion(
      completionContext, suggestions, 1,
      "getUserEmail(userId)",
      "getUserEmail(${1:entityName:ownedBy.id}) ",
      false, true,
    );
    this.addSuggestion(
      completionContext, suggestions, 1,
      "getGroupEmails(groups, groupName)",
      "getGroupEmails(${1:entityName:groups.full}, ${2:groupName: string}) ",
      false, true,
    );
  }
}