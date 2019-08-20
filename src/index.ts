import express from "express";

import * as baseController from "./controllers/base";

const app = express();

app.get('/', baseController.index);

app.listen(8080);
