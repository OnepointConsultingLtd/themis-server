/* eslint-disable radix */
/* eslint-disable no-unused-vars */
const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const url = require('../../api');

// Mongo Connection URL
const dbUrl = process.env.MONGODB_URI || 'mongodb://localhost:27017/';

const app = express();

/** bulk Deactivate */
app.post(url.rules.bulkDeactivate, (req, res) => {
  const bulkIds = req.body.array.map(id => ObjectId(id));
  MongoClient.connect(dbUrl, { useUnifiedTopology: true }, (error, client) => {
    if (error) throw error;
    console.log(`Connected to MongoDB. Deactivating rules with id's: ${bulkIds}`);
    const db = client.db('rulems');

    db.collection('rules').updateMany(
      { _id: { $in: bulkIds } },
      { $set: { active: false } },
      (err, result) => {
        if (err) {
          res.status(404).send({
            message: 'Rules could not be deactivated'
          });
        }
        console.log('Deactivate rule result: ', result.result); // Note: updateOne returns success even if no item has been updated
        client.close();
        res.status(200).send({ message: `${result.result.n} rules have been deactivated succesfully` });
      }
    );
  });
});

/** bulk Activate */
app.post(url.rules.bulkActivate, (req, res) => {
  const bulkIds = req.body.array.map(id => ObjectId(id));
  MongoClient.connect(dbUrl, { useUnifiedTopology: true }, (error, client) => {
    if (error) throw error;
    console.log(`Connected to MongoDB. Activating rules with id's: ${bulkIds}`);
    const db = client.db('rulems');

    db.collection('rules').updateMany(
      { _id: { $in: bulkIds } },
      { $set: { active: true } },
      (err, result) => {
        if (err) {
          res.status(404).send({
            message: 'Rules could not be activated'
          });
        }
        console.log('Activate rule result: ', result.result); // Note: updateOne returns success even if no item has been updated
        client.close();
        res.status(200).send({ message: `${result.result.n} rules have been activated succesfully` });
      }
    );
  });
});
/** bulk Delete */
app.post(url.rules.bulkDelete, (req, res) => {
  const bulkIds = req.body.array.map(id => ObjectId(id));
  MongoClient.connect(dbUrl, { useUnifiedTopology: true }, (error, client) => {
    if (error) throw error;
    console.log(`Connected to MongoDB. Deleting rules with id's: ${bulkIds}`);
    const db = client.db('rulems');

    db.collection('rules').deleteMany(
      { _id: { $in: bulkIds } },
      (err, result) => {
        if (err) {
          res.status(404).send({
            message: 'Rules could not be deleted'
          });
        }
        console.log('Delete rule result: ', result.result); // Note: updateOne returns success even if no item has been updated
        client.close();
        res.status(200).send({ message: `${result.result.n} rules have been removed succesfully` });
      }
    );
  });
});
/** Bulk Update tags */
app.post(url.rules.bulkUpdateTags, (req, res) => {
  const bulkIds = req.body.array.map(id => ObjectId(id));
  const { tags } = req.body;
  MongoClient.connect(dbUrl, { useUnifiedTopology: true }, (error, client) => {
    if (error) throw error;
    console.log(`Connected to MongoDB. Updating rules with id's: ${bulkIds}`);
    const db = client.db('rulems');

    db.collection('rules').updateMany(
      { _id: { $in: bulkIds } },
      { $set: { tags } },
      (err, result) => {
        if (err) {
          res.status(404).send({
            message: 'Rules could not get updated'
          });
        }
        console.log('Update rule tags result: ', result.result); // Note: updateOne returns success even if no item has been updated
        client.close();
        res.status(200).send({ message: `${result.result.n} rules have been updated succesfully` });
      }
    );
  });
});

module.exports = app;
