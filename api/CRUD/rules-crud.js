const validateRules = require('../functions/validate');
const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const url = require('../../api');

// Mongo Connection URL
const dbUrl = process.env.MONGODB_URI /*|| 'mongodb://localhost:27017/';*/

const app = express();

/** CREATE new version */
app.post(url.rules.createVersion, (req, res) => {
  const { id } = req.params;
  MongoClient.connect(dbUrl, { useUnifiedTopology: true }, (error, client) => {
    if (error) throw error;
    console.log('Connected to MongoDB. Importing new version.');
    const db = client.db('rulems');

    // Importing version by updating rule
    db.collection('rules').updateOne(
      { _id: ObjectId(id) },
      {
        $push: {
          versions: {
            $each: [req.body],
            $position: 0
          }
        }
      },
      (err, result) => {
        if (err) {
          res.status(404).send({
            message: 'Version could not be cloned'
          });
        }
        console.log('Inserted version result: ', result.result); // Note: updateOne returns success even if no item has been updated
        client.close();
        res.status(200).send({ message: 'Version has been cloned succesfully' });
      }
    );
  });
});

/** UPDATE any rule's top-level field: such as name, tags, active, locked */
// this route should prior to '/update/:id/:version': i was getting "pls pass string value" error
// https://stackoverflow.com/questions/48705503/error-argument-passed-in-must-be-a-single-string-of-12-bytes-or-a-string-of-24
app.post(url.rules.updateRule, (req, res) => {
  const { id } = req.params; // <---- ATTENTION: string type

  MongoClient.connect(dbUrl, { useUnifiedTopology: true }, async (error, client) => {
    if (error) throw error;
    console.log('Connected to MongoDB. Updating status of rule.: ', id, req.body);
    const db = client.db('rulems');
    const updateQuery = {};

    updateQuery[Object.keys(req.body)[0]] = Object.values(req.body)[0]; // key-value included in req.body

    db.collection('rules').findOneAndUpdate(
      { _id: ObjectId(id) },
      { $set: updateQuery }, // <------ req.body is a JSON object (thanks to body-parser)
      (err, result) => {
        if (err) {
          res.status(404).send({
            message: 'Rules status could not be updated'
          });
        }
        console.log('Updated version result: ', !!result.value); // Note: updateOne returns success even if no item has been updated
        client.close();
        if (!result.value) res.status(404).send({ message: 'Rules status could not be updated' });
        else res.status(200).send({ message: 'Rules status has been updated succesfully' });
      }
    );
  });
});

/** UPDATE the whole rule (all versions incl.) */
app.post(url.rules.updateVersion, (req, res) => {
  const { id, version } = req.params; // <---- ATTENTION: string type
  console.log(req.body.versions, version);
  // validating the content of the specific rule version only
  const { err, stdout } = validateRules(req.body.versions.filter(versionItem => versionItem.version == version)[0].content);
  if (err) res.status(404).send({ message: 'Rule could not get validated' }); // VALIDATION process error
  else if (stdout.length === 0) { // VALID RULE
    MongoClient.connect(dbUrl, { useUnifiedTopology: true }, async (error, client) => {
      if (error) throw error;
      console.log('Connected to MongoDB. Updating version.:', req.body);
      const db = client.db('rulems');

      delete req.body._id; // removing posted '_id' field

      db.collection('rules').findOneAndReplace(
        { _id: ObjectId(id) },
        req.body,
        (replaceErr, result) => {
          if (replaceErr) {
            res.status(404).send({
              message: 'Rule could not be updated'
            });
            client.close();
          } else {
            console.log('Updated version result: ', result.value); // Note: updateOne returns success even if no item has been updated
            client.close();
            if (!result.value) res.status(404).send({ message: 'Rule could not be updated' });
            else res.status(200).send({ message: 'Rule has been updated succesfully' });
          }
        }
      );
    });
  } else res.status(201).send({ errorArray: stdout }); // INVALID RULE, send array of error(s)
});

/** DELETE a rule */
app.post(url.rules.delete, (req, res) => {
  const { id } = req.params;
  MongoClient.connect(dbUrl, { useUnifiedTopology: true }, (error, client) => {
    if (error) throw error;
    console.log(`Connected to MongoDB. Deleting rule ${id}`);
    const db = client.db('rulems');

    db.collection('rules').deleteOne(
      { _id: ObjectId(id) },
      (err, result) => {
        if (err) {
          res.status(404).send({
            message: 'Rule could not be deleted'
          });
          client.close();
        } else {
          console.log('Delete rule result: ', result.result); // Note: updateOne returns success even if no item has been updated
          client.close();
          res.status(200).send({ message: 'Rule has been removed succesfully' });
        }
      }
    );
  });
});

module.exports = app;
