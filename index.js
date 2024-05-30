const express = require("express");
const cors = require("cors");
const app = express();
var jwt = require("jsonwebtoken");
require("dotenv").config();
var cookieParser = require("cookie-parser");
const port = process.env.PORT || 5000;

// middlewere
app.use(cors());
app.use(express.json());
app.use(cookieParser());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.dbn21dt.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const menuCollection = client.db("coffeeDB").collection("menu");
    const reviewCollection = client.db("coffeeDB").collection("review");
    const cartCollection = client.db("coffeeDB").collection("carts");
    const usersCollection = client.db("coffeeDB").collection("users");

    // Json token
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "3h",
      });
      res.send({ token });
    });

    // VerifyToken
    const verifyToken = (req, res, next) => {
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "Unauthorized Access!" });
      }
      const token = req.headers.authorization.split(" ")[1];

      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "Unauthorized Access!" });
        }
        req.decoded = decoded;
        next();
      });
    };

    // VerifyAdmin
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded?.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const isAdmin = user?.role === "admin";
      if (!isAdmin) {
        return res.status(403).send({ message: "Forbidden Access!" });
      }
      next();
    };

    // MENU RELETED API

    app.get("/menu", async (req, res) => {
      const result = await menuCollection.find().toArray();
      res.send(result);
    });

    app.post("/menu", verifyToken, verifyAdmin, async (req, res) => {
      const body = req.body;
      const result = await menuCollection.insertOne(body);
      res.send(result);
    });

    app.delete("/menu/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await menuCollection.deleteOne(query);
      res.send(result);
    });

    app.get("/review", async (req, res) => {
      const result = await reviewCollection.find().toArray();
      res.send(result);
    });

    // Cart releted APIS
    app.post("/carts", async (req, res) => {
      const body = req.body;
      const result = await cartCollection.insertOne(body);
      res.send(result);
    });

    app.get("/cart", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await cartCollection.find(query).toArray();
      res.send(result);
    });

    app.delete("/carts/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await cartCollection.deleteOne(query);
      res.send(result);
    });

    // users releted api

    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user?.email };
      const ExistingUser = await usersCollection.findOne(query);
      if (ExistingUser) {
        return res.send({ message: "User Already Exists", insertedId: null });
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    app.get("/users", verifyToken, async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    app.delete("/users/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await usersCollection.deleteOne(query);
      res.send(result);
    });

    app.patch("/users/admin/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.get("/user/admin/:email", verifyToken, async (req, res) => {
      const email = req.params.email;

      if (email !== req.decoded?.email) {
        return res.status(403).send({ message: "Forbidden Access!" });
      }
      let query = { email: email };
      const user = await usersCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === "admin";
      }
      res.send({ admin });
    });
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Port is Running with full Speed");
});
app.listen(port, () => {
  console.log(`Port is Running from ${port}`);
});
