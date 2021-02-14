/* eslint-disable radix */
/* eslint-disable no-unused-vars */
const validateRules = require('../functions/validate');
const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const dedupQuery = require('../functions/aggregations');
const url = require('../../api');

// Mongo Connection URL
const dbUrl = process.env.MONGODB_URI || 'mongodb://localhost:27017/';

const app = express();

/** FETCH ALL Rules */
app.get(url.rules.read, (req, res) => {
  MongoClient.connect(dbUrl, { useUnifiedTopology: true }, (error, client) => {
    if (error) throw error;
    console.log('Connected to MongoDB. Fetching rules list.');
    // const mysort = { name: 1 }; // sort by ID // TODO : Decouple-remove ID from Rule-name
    const db = client.db('rulems');
    db.collection('rules').find({}).toArray((err, rules) => {
      if (err) throw err;
      res.send(rules);
      client.close();
    });
  });
});

/** IMPORT new Rules and dedup */
app.post(url.rules.create, (req, res) => {
  MongoClient.connect(dbUrl, { useUnifiedTopology: true }, (error, client) => {
    if (error) throw error;
    console.log('Connected to MongoDB. Importing new rules.');
    // const mysort = { name: 1 }; // sort by ID // TODO : Decouple-remove ID from Rule-name
    const db = client.db('rulems');

    // TODO: Add rule(s) validation here

    // Importing the rules
    db.collection('rules').insertMany(req.body, (err, rules) => {
      if (err) {
        res.status(404).send({
          message: 'Rules could not be imported'
        });
      }
      req.body.forEach(rule => console.log(rule.versions));
      // Perform duplicates search after the import of new rules
      db.collection('rules').aggregate(dedupQuery).toArray((dupErr, dupList) => {
        /** At the end you'll have an ARRAY !! [{ _idsNeedsToBeDeleted: [_ids] }] or [] */
        if (dupErr) throw dupErr;
        console.log(dupList);
        let dupIds = [];
        // Perform deduplication
        if (dupList && dupList.length > 0) {
          console.log('Found duplicates: ', dupList);
          // Convert array of string id's into array of ObjectId's
          dupIds = dupList[0]._idsNeedsToBeDeleted.map(id => ObjectId(id));
          // Perform deduplication
          db.collection('rules').deleteMany({ _id: { $in: dupIds } }, (deleteErr, result) => {
            if (deleteErr) throw deleteErr;
            client.close();
          });
        }
        // Sending the response back to client alogn w/ all insertedId's and dups-deletedId's
        res.status(200).send({ message: 'Rules have been imported succesfully', insertedIds: rules.insertedIds, deletedIds: dupIds });
      });
    });
  });
});

module.exports = app;
