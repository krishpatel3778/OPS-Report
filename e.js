const fs = require('fs');
const cheerio= require('cheerio');
const puppeteer = require('puppeteer');
const {google}=require('googleapis');
const prompt= require('prompt-sync')();
function reader(file,file1){
  var result1=extractor(file);
  var result2=extractor(file1);
  var prevNumber=0;
  var newResult2=[];
  for(var x=0;x<result2.length;x++){
    if(result2[x].indexOf("/")!=-1){
      var number=parseInt(result2[x].split("/")[1]);
      if((number-prevNumber)==1){
        newResult2.push(result2[x-1]);
        newResult2.push(result2[x]);
        prevNumber=number;
      }else{
        for(var z=1;z<(number-prevNumber);z++){
          newResult2.push("Total for DR $0.00");
          newResult2.push("Added date /");
        }
        newResult2.push(result2[x-1]);
        newResult2.push(result2[x]);
        prevNumber=number;
      }
    }
  }
  var combined=[];
  var re2=0;
  for(var f=0;f<result1.length;f++){
    if(result1[f].indexOf("/")!=-1){
      combined.push(newResult2[re2]);
      combined.push(result1[f]);
      re2+=2;
    }else{
      combined.push(result1[f]);
    }
  }
  editor(combined);
}
function extractor(fileName){
  const html=fs.readFileSync("../"+fileName);
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
  return array;
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
  var taxes=new Array(2);
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
			taxes[0]=int;
    }else if(data[i].indexOf("TAX2")!=-1){
		taxes[1]=int;
    }else if(data[i].indexOf("AX")!=-1){
      index=7;
    }else if(data[i].indexOf("DR")!=-1){
      if(data[i].indexOf("(")!=-1){
  			int*=-1;
  		}
      index=9;
    }else if(data[i].indexOf("CA")!=-1){
      if(data[i].indexOf("(")==-1){
  			int*=-1;
  		}
      index=10;
    }else if(data[i].indexOf("CK")!=-1){
      if(data[i].indexOf("(")==-1){
  			int*=-1;
  		}
      index=11;
    }else if(data[i].indexOf("DS")!=-1){
      index=6;
    }else if(data[i].indexOf("GIFT")!=-1){
      if(data[i].indexOf("(")!=-1){
  			int*=-1;
  		}
      index=1;
    }else if(data[i].indexOf("MC")!=-1){
      index=4;
    }else if(data[i].indexOf("PETS")!=-1){
  		if(data[i].indexOf("(")!=-1){
  			otherRevenue-=int;
  		}else{
  			otherRevenue+=int;
  		}
      index=undefined;
    }else if(data[i].indexOf("RM")!=-1){
      index=0;
    }else if(data[i].indexOf("VI")!=-1){
      index=3;
    }else if(data[i].indexOf("MISC")!=-1){
        if(data[i].indexOf("(")!=-1){
  			otherRevenue-=int;
  		}else{
  			otherRevenue+=int;
  		}
      index=undefined;
    }else if(data[i].indexOf("XBED")!=-1){
      if(data[i].indexOf("(")!=-1){
  			otherRevenue-=int;
  		}else{
  			otherRevenue+=int;
  		}
      index=undefined;
    }else if(data[i].indexOf("/")!=-1){
      pastingArray[2]=otherRevenue;
      pastingArray[5]=pastingArray[3]+pastingArray[4];

      for(d=0;d<pastingArray.length;d++){
        if(pastingArray[d]==undefined){
          pastingArray[d]=0;
        }
      }

      await googleSheets.spreadsheets.values.update({
          auth,
          spreadsheetId,
          range:`Room Payments!C${startRow}:O${startRow}`,
          valueInputOption:"USER_ENTERED",
          resource: {values:[pastingArray]}
          });
		await googleSheets.spreadsheets.values.update({
          auth,
          spreadsheetId,
          range:`Tax!D${startRow}:E${startRow}`,
          valueInputOption:"USER_ENTERED",
          resource: {values:[taxes]}
          });
      startRow++;
      otherRevenue=0;
      pastingArray=new Array(13);
	  taxes=new Array(2);

    }
    if(index!=undefined){
      pastingArray[index]=int;
    }
  }
}
const file=prompt("Transactions total file name:");
const file1=prompt("Daily Recievable file name:");
reader(file,file1);
