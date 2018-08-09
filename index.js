// III - Ryan - Service Integration - Homework Summit Sample

const
    restify = require('restify'),
    config = require('config'),
    builder = require('botbuilder'),
    apiAIRecognizer = require('api-ai-recognizer'),
    request = require('request');

const DIALOGFLOW_CLIENT_ACCESS_TOKEN = config.get('dialogFlowClientAccessToken'),
      SHEETDB_API_ID = config.get('SheetDB_API_id'),
      MICROSOFT_APP_ID =config.get('Microsoft_APP_id'),
      MICROSOFT_APP_PASSWORD =config.get('Microsoft_APP_password');

var recognizer = new apiAIRecognizer(DIALOGFLOW_CLIENT_ACCESS_TOKEN);
var intents = new builder.IntentDialog({recognizers:[recognizer]});

var server = restify.createServer();
server.listen(process.env.PORT || process.env.port || 3978,
    function(){
        console.log('%s listening to %s',server.name, server.url);
    }
);

var connector = new builder.ChatConnector({
    appId: MICROSOFT_APP_ID,
    appPassword: MICROSOFT_APP_PASSWORD
});

var inMemoryStorage = new builder.MemoryBotStorage();
var bot = new builder.UniversalBot(connector).set('storage', inMemoryStorage);
server.post('/api/messages',connector.listen());
bot.dialog('/',intents);

intents.matches('Summit Final Project',function(session,args){
    var checkAction = builder.EntityRecognizer.findEntity(args.entities,"actionIncomplete");
    var studentIDObject = {},
        studentNameObject = {},
        studentWebsiteObject = {};
    if(checkAction.entity) //Check if action is complete
    { //not yet, continue to get key info
        var myFulfillment = builder.EntityRecognizer.findEntity(args.entities,'fulfillment');
        session.send(myFulfillment.entity);
    }else
    { //complete, confirm and summit
        studentIDObject = builder.EntityRecognizer.findEntity(args.entities,'StudentID');
        studentNameObject = builder.EntityRecognizer.findEntity(args.entities,'StudentName');
        studentWebsiteObject = builder.EntityRecognizer.findEntity(args.entities,'StudentWebsite'); //know issue: MS will turn all entity to lowercase
        session.send("好哦！ %s, 你的學號是 %s, 你的期末作業是 %s. 馬上為你登記！",
        studentNameObject.entity, studentIDObject.entity, session.message.text);
        summitToSheetDB(studentNameObject.entity, studentIDObject.entity, session.message.text,session);
    }
});

intents.matchesAny(['Default Fallback Intent','Default Welcome Intent','None'],function(session,args){
    session.send('想交作業嗎？請說[我想要上傳作業]、[我想要交作業]一類的，謝謝你~');
});
function summitToSheetDB(sID, sName, sUrl, session){
    console.log(sID, sName, sUrl);
    request({
        uri:'https://sheetdb.io/api/v1/'+SHEETDB_API_ID,
        json:true,
        method:'POST',
        headers:{'Contenot-Type':'application/json'},
        body:{
            'data':[{
                        "Number":sID, "Name":sName, "Website":sUrl
                    }]
        }
    },function(error, response, body){
        if(!error && response.statusCode == 201){
            session.send('作業上傳完成!');
        }else{ console.log(error);}
    });
}
