import autoTable from "jspdf-autotable";

(global as any).$RefreshReg$ = () => {};
(global as any).$RefreshSig$$ = () => () => {};

export const addPageNum = (doc: any) => {
  doc.setFontSize(7)
  doc.text(String(doc.internal.getNumberOfPages()), 29.1, 20.9)
}

const getColumnBackground = (id:string) => {
  switch(id){
    case "1": return "#dedede"
    case "2": return "#becde1"
    case "3": return "#fdd9c1"
    case "4": return "#fdecbc"
    case "5": return "#ccefb5"
    case "6": return "#abeaff"
    case "7": return "#afffaf"
    case "8": return "#ffd4b5"
    case "9": return "#ffb2a1"
    case "10": return "#ffffad"
  }
}

export const HazardSheets = (data:Array<any>, projectInformation:any, doc:any) => {

  doc.addPage()
  doc.setDrawColor(0, 0, 0)
  doc.setFontSize(25)
  doc.text(`HAZARD DESCRIPTION REQUIREMENTS`, 6, 10.5)


  /* Top Table */
  doc.addPage()

  const headerBkgColor = '#ccdcff'

  autoTable(doc, {
    theme:'grid',
    styles: { fontSize: 7, cellPadding: 0.1, lineColor: '#000', lineWidth: 0.02, textColor: '#000'},
    head: [ [ 'Project ID', 'Project Reference', `Planner's Name`, `Surveyor's Name`, 'Survey Date' ] ],
    headStyles: { fontSize: 8, fillColor: headerBkgColor, cellPadding: 0.2, textColor: '#000' },
    margin: { top: 2, bottom: 1.6 },
    body:
      [ [
        projectInformation.projectId,
        projectInformation.projectReference,
        projectInformation.projectPlanner,
        projectInformation.projectSurveyorsName,
        projectInformation.projectDate] ]
  })


  /* Hazard Sheet Table */

  const tableData = data.map((dataItem: any) => [
    dataItem[0],
    dataItem[1],
    dataItem[2],
    dataItem[3],
    dataItem[4],
    dataItem[5],
    dataItem[6]
  ])

  autoTable(doc, {
    theme:"grid",
    styles: { fontSize: 6, cellPadding: 0.1, lineColor: '#000', lineWidth: 0.02, textColor: '#000' },
    head: [
      [
        'Type',
        'ID',
        'Safety Caution',
        `Guidance For Planners/Surveyor`,
        'Caution',
        'Yes / No',
        'Guidance for Contractors'
      ]
    ],
    headStyles: { fontSize: 8, fillColor: headerBkgColor, cellPadding: 0.2, textColor: '#000' },
    rowPageBreak: 'avoid',
    columnStyles: {
      0: {cellWidth: 2},
      1: {cellWidth: 0.8, halign:'center'},
      2: {cellWidth: 3},
      3: {cellWidth: 5},
      4: {cellWidth: 6},
      5: {cellWidth: 2, halign:'center'},
    },
    margin: { top: 2, bottom: 1.6 },
    body: tableData,
    didDrawPage: function (data) {
      addPageNum(doc)
    },
    didParseCell(data:any){

      /* Draw different fill color for the leading cell */
      const id = (data.row.raw[1]).split('.')[0]

      if(data.column.dataKey === 0 && id !== "ID")
        data.cell.styles.fillColor = getColumnBackground(id)

    }
  })

}