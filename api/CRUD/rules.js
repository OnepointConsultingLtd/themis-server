/* eslint-disable radix */
/* eslint-disable no-unused-vars */
const validateRules = require('../functions/validate');
const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const dedupQuery = require('../functions/aggregations');

// Mongo Connection URL
const dbUrl = process.env.MONGODB_URI || 'mongodb://localhost:27017/';

const app = express();


/** FETCH ALL Rules */
app.get('/rules/load', (req, res) => {
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
app.post('/rules/import', (req, res) => {
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

/** IMPORT new version */
app.post('/version/clone/:id', (req, res) => {
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
app.post('/rules/update/:id', (req, res) => {
  const { id } = req.params; // <---- ATTENTION: string type

  MongoClient.connect(dbUrl, { useUnifiedTopology: true }, async (error, client) => {
    if (error) throw error;
    console.log('Connected to MongoDB. Updating status of rule.: ', id, req.body);
    const db = client.db('rulems');
    const updateQuery = {};
    // eslint-disable-next-line prefer-destructuring
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
app.post('/version/update/:id/:version', (req, res) => {
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
app.post('/rules/delete/:id', (req, res) => {
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

// ---------------------------------------> BULK ACTIONS
/** bulk Deactivate */
app.post('/bulk/rules/deactivate', (req, res) => {
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
app.post('/bulk/rules/activate', (req, res) => {
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
app.post('/bulk/rules/delete', (req, res) => {
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
app.post('/bulk/rules/update/tags', (req, res) => {
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
// <-------------------------------------- BULK ACTIONS


module.exports = app;
