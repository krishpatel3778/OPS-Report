const fs = require('fs');
const cheerio= require('cheerio');
const puppeteer = require('puppeteer');
const {google}=require('googleapis');
const prompt= require('prompt-sync')();
async function convertPdfToHtml(){
    let launchOptions = { headless:false, args: ['--start-maximized']};
    const browser = await puppeteer.launch(launchOptions);
    const page = await browser.newPage();
    await page.setViewport({width: 1366, height: 768});
    await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Safari/537.36');
    await page.goto('https://pdf.online/convert-pdf-to-html');
    await page.waitForSelector('input[type=file]');
    const inputUploadHandle = await page.$("#__next > div > div.css-1birzxg > div.main.css-10w2n2b > div > input[type=file]");
    inputUploadHandle.uploadFile("23574-Report.pdf");
    await page.waitForXPath('//*[@id="__next"]/div/div[2]/div[4]/div/div/div[2]/button',{timeout:0});
    var convert=await page.evaluate(()=>document.querySelector('button.chakra-button.css-nado83').innerText);
    page.click('button.chakra-button.css-nado83');
    await page.waitForXPath('//*[@id="__next"]/div/div[2]/div[1]/div/div/div[2]/div/div[1]/div/div/div/div/div/div/div/div[3]/button[2]',{timeout:0});
    var download= await page.evaluate(()=>document.querySelector('button.chakra-button.css-nado83').innerText);
    await page.click('button.chakra-button.css-nado83');
     var name=await page.evaluate(()=>document.querySelector("#__next > div > div.css-1birzxg > div.main.css-10w2n2b > div > div > div.css-sq9jg7 > div > div:nth-child(1) > div > div > div > div > div > div > div > div.css-rpw0u0").innerText);
     var file="/Users/krish/Downloads/";
    file+=name;
    while(true){
    var exists=await fs.existsSync(file);
    if(exists){
      break;
    }
  }
    browser.close();
    extractor(file);
}
async function extractor(file){
  const html=fs.readFileSync(file);
  const content=cheerio.load(html);
  var body=content(".s2,.s3,.s4,.s5,.s6,.s1,h1,h2,p,h3");
  var array=[];
  for(var i=0;i<body.length;i++){
      var condition=false;
    if(content(body[i]).text().includes("Total")){
      condition=true
    if(content(body[i+1]).text().includes("$")&&(!content(body[i+1]).text().includes("Total"))){
      condition=false;
      var pushText=content(body[i]).text()+content(body[i+1]).text();
      array.push(pushText);
    }
  }
    if(condition){
      var pushText=content(body[i]).text();
      if(pushText.trim()=="Total"){
        pushText=content(body[i]).text()+content(body[i+1]).text()+content(body[i+2]).text()
      }
      array.push(pushText);
    }

  }
  editor(array);

  //fs.unlinkSync(file);
}
async function editor(data){
  const auth=new google.auth.GoogleAuth(
  {
  keyFilename:"../credentials.json",
  scopes:["https://www.googleapis.com/auth/spreadsheets","https://www.googleapis.com/auth/drive"]
});
  const client=await auth.getClient();
  const googleSheets=google.sheets({version:"v4",auth:client});
  const spreadsheetId=prompt("Enter the spreadsheetID: ");
  var pastingArray=new Array(13);
  var otherRevenue=0;
  var startRow=7;
  for(var i=0;i<data.length;i++){
    var int=data[i].split("$")[1];
    if(int!=undefined){
      int=int.replaceAll(",","").match(/\d+(\.\d+)?/);
      if(int!=null){
        int=parseFloat(int[0]);
      }
    }
    var index=undefined;
    if(data[i].indexOf("TAX1")!=-1){

    }else if(data[i].indexOf("TAX2")!=-1){
    }else if(data[i].indexOf("AX")!=-1){
      index=7;
    }else if(data[i].indexOf("CA")!=-1){
      index=10;
    }else if(data[i].indexOf("CK")!=-1){
      index=11;
    }else if(data[i].indexOf("DS")!=-1){
      index=6;
    }else if(data[i].indexOf("GIFT")!=-1){
      index=1;
    }else if(data[i].indexOf("MC")!=-1){
      index=4;
    }else if(data[i].indexOf("PETS")!=-1){
      otherRevenue+=int;
      index=undefined;
    }else if(data[i].indexOf("RM")!=-1){
      index=0;
    }else if(data[i].indexOf("VI")!=-1){
      index=3;
    }else if(data[i].indexOf("MISC")!=-1){
      otherRevenue+=int;
      index=undefined;
    }else if(data[i].indexOf("XBED")!=-1){
      otherRevenue+=int;
      index=undefined;
    }else if(data[i].indexOf("/")!=-1){
      pastingArray[2]=otherRevenue;
      pastingArray[5]=pastingArray[3]+pastingArray[4];
      pastingArray[8]="";
      pastingArray[9]="";
      pastingArray[12]="";
      for(d=0;d<pastingArray.length;d++){
        if(pastingArray[d]==undefined){
          pastingArray[d]=0;
        }
      }

      await googleSheets.spreadsheets.values.update({
          auth,
          spreadsheetId,
          range:`Sheet2!C${startRow}:O${startRow}`,
          valueInputOption:"USER_ENTERED",
          resource: {values:[pastingArray]}
          });
      startRow++;
      otherRevenue=0;
      pastingArray=new Array(13);

    }
    if(index!=undefined){
      pastingArray[index]=int;
    }



  }
}
const file=prompt("Enter the name of file:");
extractor(file);
