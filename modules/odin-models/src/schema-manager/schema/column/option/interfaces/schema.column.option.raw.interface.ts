/**
 * Interface for the raw values returned after
 * update, create, delete
 */
export interface SchemaColumnOptionRaw {

  id: string,
  label: string,
  value: string,
  description?: string,
  position: number,
  columnId: string

}
