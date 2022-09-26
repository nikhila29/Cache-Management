//Cache is mainly used to reduce the server lag and reduce the loading speed of web page data.
const express = require("express");  //a web server framework for Node.js
const axios = require("axios");  // a Node.js HTTP client, which is helpful for making API calls
const redis = require("redis");   //a Redis client that allows you to store and access data in Redis.

const app = express();
const port = process.env.PORT || 3000;


// configure redis server
//did not provide the port for Redis to use when you invoked the createClient() method, Redis will use port 6379, the default port.
//also call the Node.js on() method that registers events on the Redis object. The on() method takes two arguments: error and a callback. 
//The first argument error is an event triggered when Redis encounters an error. 
//The second argument is a callback that runs when the error event is emitted. The callback logs the error in the console.

let redisClient;
//anonymous self-invoked asynchronous function,

// (async () => {
//   redisClient = redis.createClient();

//   redisClient.on("error", (error) => console.error(`Error : ${error}`));

//   await redisClient.connect();
// })();

///VS
//arrow function

// const  connect= async()=>{
//   redisClient = redis.createClient();

//   redisClient.on("error", (error) => console.error(`Error : ${error}`));

//   await redisClient.connect();
// }
// connect;

// VS

async function  connectN(){
  redisClient = redis.createClient();

  redisClient.on("error", (error) => console.error(`Error : ${error}`));

  await redisClient.connect();
}
connectN()


redisClient.on('error', function (err) {
  console.log('Could not establish a connection with redis. ' + err);
});


redisClient.on('connect', function (err) {
  console.log('Connected to redis successfully');
});


//fetching an API data, and sending request to an API ,Finally, return the data from the API.

async function fetchApiData(species) {    
  const apiResponse = await axios.get(      
    `https://www.fishwatch.gov/api/species/${species}`
  );
  console.log("Request sent to the API");
  return apiResponse.data;
}

async function getSpeciesData(req, res) {

  // The request object contains information about the client, while the response object contains the information 
  //that will be sent to the client from Express.
  
  const species = req.params.species;  // extract the value captured from the endpoint stored in the req.params object, then assign it to the species variable
  let results;
  let isCached = false;  // cache data is not there , if there set to true

  try {
    const cacheResults = await redisClient.get(species);
    if (cacheResults) {
      isCached = true;
      results = JSON.parse(cacheResults);
    } else {
      results = await fetchApiData(species);   // call fetchApiData() to retrieve data from an API in the getSpeciesData() callback function:
      if (results.length === 0) {
        throw "API returned an empty array";
      }
      await redisClient.set(species, JSON.stringify(results), {
        EX: 5, //seconds
        NX: true, 
      });
      //EX: accepts a value with the cache duration in seconds.
      //NX: when set to true, it ensures that the set() method should only set a key that doesn’t already exist in Redis.
    }

//The send method takes an object that has the following properties:

//fromCache: the property accepts a value that helps you know whether data is coming from the Redis cache or the API. 
//You now assigned a false value because the data comes from an API.

//data: the property is assigned the results variable that contains the data returned from the API.

    res.send({
      fromCache: isCached,
      data: results,
    });
  } catch (error) {
    console.error(error);
    res.status(404).send("Data unavailable");
  }
}

app.get("/fish/:species", getSpeciesData);  // URL =====   fish/red-snapper

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});