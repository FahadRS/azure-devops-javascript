

let PAT_TOKEN = "";
let BASE_URL = "";
const axios = require('axios');

var encodedToken = Buffer.from( ":" + PAT_TOKEN).toString('base64');
const headers = { 'Content-Type': 'application/json', 'Authorization': 'Basic '+ encodedToken,  'cache-control': 'no-cache' };
let patchHeader  = { 'Content-Type': 'application/json-patch+json', 'Authorization': 'Basic '+ encodedToken,  'cache-control': 'no-cache' };


async function getWorkItemIds(query) {

    return new Promise(function(resolve, reject) {

            let queryURL  =  BASE_URL + "_apis/wit/wiql?api-version=6.0";
            body = { "query": query };

            axios.post(queryURL, body, { headers : headers } ).then(function (response) { 
                let workItems = response.data.workItems;
                let workItemIds = workItems.map( a=> a.id );
                console.log("Ids Recieved" +  workItemIds.length, workItemIds);
                resolve(workItemIds);
            })
            .catch(function (error) {
                console.log(error);
                reject(error);
            });
    });

}

async function fetchWorkItemDetails(workItemIds, fieldsToFetch)  {

    return new Promise(function(resolve, reject) {

        console.log("fetchWorkItemDetails",workItemIds)
        let queryURL  =  BASE_URL + "_apis/wit/workitemsbatch?api-version=6.0";
        let body = {
            "ids": workItemIds,
            "fields": fieldsToFetch
        };

        axios.post(queryURL, body, { headers : headers } ).then(function (response) {
            let workItems = response.data.value;   
            console.log("fetchWorkItemDetails success");         
            resolve(workItems);            
        })
        .catch(function (error) {
            console.log(error);
            console.log("fetchWorkItemDetails failure");
            reject(error);
        });
    });
}

async function patchWorkItem(workItemId, fieldKey, fieldValue)  {

    return new Promise(function(resolve, reject) {

        let url  =  BASE_URL + "_apis/wit/workitems/"+workItemId+"?api-version=6.0";
        let body = [
            {
                "op": "add",
                "path": "/fields/" + fieldKey,
                "value": fieldValue
            }];

        axios.patch(url, body, { headers : patchHeader } ).then(function (response) {
            console.log("updateWorkItem: Success", workItemId);
            resolve(response)
        })
        .catch(function (error) {
            console.log("updateWorkItem: Failed", workItemId);
            reject(error)
        });
    });

}


async function createWorkItem(title)  {

    return new Promise(function(resolve, reject) {

        let Url  =  BASE_URL + "_apis/wit/workitems/$Bug?api-version=6.0";
        let body = [
            {
            "op": "add",
            "path": "/fields/System.Title",
            "from": null,
            "value": title
            },
            {
                "op": "add",
                "from": null,
                "path": "/fields/" + "Custom.ReporostepsDoNotUse",
                "value": "This is Custom Fields"
                
            },        
        ];

            axios.post(Url, body, { headers : patchHeader } ).then(function (response) 
            { 
                console.log("created ticket", response);         
                resolve(response);
            })
            .catch(function (error) {
                console.log("rejected");
                reject(error);
            });
    });
}

async function deleteWorkItem(id)  {

    return new Promise(function(resolve, reject) {

        let Url  =  BASE_URL + "/_apis/wit/workitems/"+id+"?api-version=6.0";
       
        axios.delete(Url, { headers : patchHeader } ).then(function (response) 
        { 
            console.log("Deleted ticket", id);         
            resolve(response);
        })
        .catch(function (error) {
            console.log("Deleted ticket Failed", id);         
            reject(error);
        });
    });
}

async function copyFieldValue(oldFieldName, newFieldName, workkItemType){

   // first get the Ids of the work Items
   let query = `SELECT [System.Id]
   FROM workitems
   WHERE
       [Custom.ReporostepsDoNotUse] IS NOT EMPTY
       AND [Microsoft.VSTS.TCM.ReproSteps] IS EMPTY
       AND[System.WorkItemType] = '` + workkItemType + `'
   ORDER BY[System.ID] DESC`;
   let workItemIds =  await getWorkItemIds(query);

   while(workItemIds.length > 0) 
   {
         let ids = workItemIds.slice(0,200);
         workItemIds.splice(0,200);
        // make the batch of 200 and get the details of the work items
        let fields =  [ "System.Id", oldFieldName];
       
        let workItems = await fetchWorkItemDetails(ids, fields);

        // now loop thrught every work item and update its new value from the old value

        for(let workItem of workItems) {
            let fields = workItem.fields;
            let fieldKey = oldFieldName;
            let oldFieldValue = fields[fieldKey];
            await patchWorkItem(workItem.id,newFieldName, oldFieldValue)
        }
    }

   // loop through every work item and update the value

}

async function deleteAll(workkItemType){

    // first get the Ids of the work Items
    let query = `SELECT [System.Id]
                FROM workitems
                WHERE [System.WorkItemType] = '` + workkItemType + `'
                ORDER BY[System.ID] DESC`;
   let workItemIds =  await getWorkItemIds(query);

    for(let workItemId of workItemIds) {
        await deleteWorkItem(workItemId)
    }
}

copyFieldValue("Custom.ReporostepsDoNotUse", "Microsoft.VSTS.TCM.ReproSteps", "Bug")
//deleteAll("Bug");
