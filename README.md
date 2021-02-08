# themis serverside API
Node.js service API for Themis rules manager written in express.js. Integration w/ MongoDB

## Endpoints list
### Config tables CRUD API
| Path               | Description |
| :----------------- |:------------|
|/:branch/load       |             |
|/:branch/create     |             |
|/:branch/update/:id |             |
|/:branch/delete/:id |             |

### Rules table CRUD API
| Path           | Description  |
| :------------- |:-------------|
| /rules/load       |             |
| /rules/import       |             |
| /version/clone/:id     |             |
| /rules/update/:id     |             |
| /version/update/:id/:version     |             |
| /rules/delete/:id     |             |
| /bulk/rules/deactivate     |             |
| /bulk/rules/activate     |             |
| /bulk/rules/delete     |             |
| /bulk/rules/update/tags     |             |

### Deploy API for uploading .dslr files to Azure Storage
| Path           | Description |
| :------------- |:-------------|
| /deploy/azure-storage/:fileName     |             |

### Deploy API for uploading .dslr files to local server files system
| Path           | Description |
| :------------- |:-------------|
| /deploy/dev     |             |
| /deploy/prod     |             |
