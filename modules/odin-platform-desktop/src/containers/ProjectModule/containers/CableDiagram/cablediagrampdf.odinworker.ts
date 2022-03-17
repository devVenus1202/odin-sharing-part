import jsPDF from 'jspdf'

/* eslint-disable-next-line no-restricted-globals */
const ctx: Worker = self as any;


const getSLDImageSize = (image: any, doc: any) => {

  let response = { width: 0, height: 0 }
  const imageProps = doc.getImageProperties(image)

  /* Landscape */
  if (imageProps.width > imageProps.height) {
    response.width = 28
    response.height = 28 / (imageProps.width / imageProps.height)
  }
  /* Portrait */
  else {
    response.height = 21
    response.width = 21 / (imageProps.height / imageProps.width)
  }

  return response

}


ctx.addEventListener("message", (data: any) => {

  const baseImage = data.data

  let doc = new jsPDF({
    orientation: "landscape",
    unit: "cm",
    compress: true
  })

  const imageSize = getSLDImageSize(baseImage, doc)
  doc.addImage(baseImage, 'PNG', 0.4, 0.4, imageSize.width, imageSize.height, undefined, "FAST")

  const blob = doc.output('blob');
  postMessage(blob);

})