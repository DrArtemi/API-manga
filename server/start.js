import { MongoClient, ObjectId } from 'mongodb'
import express from 'express'
import bodyParser from 'body-parser'
import { graphqlExpress, graphiqlExpress } from 'graphql-server-express'
import { makeExecutableSchema } from 'graphql-tools'
import cors from 'cors'

var args = process.argv.slice(2);

const app = express();

app.use(cors());

const homePath = '/graphiql';
const URL = 'http://localhost';
const PORT = 4444;

let user = encodeURIComponent(args[0]);
let pass = encodeURIComponent(args[1]);
let database = encodeURIComponent(args[2]);
const authMechanism = 'DEFAULT';
const authDatabase = 'admin';

const MONGO_URL = 'mongodb://' + user + ':' + pass + '@localhost:27017/' + database + '?authMechanism=' + authMechanism + '&authSource=' + authDatabase;

const prepare = (o) => {
  o._id = o._id.toString();
  return o;
}

export const start = async () => {
  try {
    const db = await MongoClient.connect(MONGO_URL);

    const Mangas = db.collection('mangas');
    const Chapters = db.collection('chapters');

    const typeDefs = [`
      type Query {
        mangas: [Manga]
        chapters: [Chapter]
      }

      type Manga {
        _id: String
        title: String
        description: String
        status: String
        image_path: String
        chapters: [Chapter]
      }

      type Chapter {
        _id: String
        chapter: String
        volume: String
        link: String
        date: String
        manga: Manga
      }

      schema {
        query: Query
      }
    `];

    const resolvers = {
      Query: {
        mangas: async () => {
          return (await Mangas.find({}).sort({ title: 1 }).toArray()).map(prepare)
        },
        chapters: async () => {
          return (await Chapters.find({}).limit(50).sort({ date: -1 }).toArray()).map(prepare)
        }
      },
      Manga: {
        chapters: async (parent) => {
          return (await Chapters.find({ 'manga': parent._id }).sort({ date: -1 }).toArray()).map(prepare);
        }
      },
      Chapter: {
        manga: async (parent) => {
          return await Mangas.findOne({ '_id': parent.manga });
        }
      }
    };

    const schema = makeExecutableSchema({
      typeDefs,
      resolvers
    });


    app.use('/graphql', bodyParser.json(), graphqlExpress({schema}));

    app.use(homePath, graphiqlExpress({
      endpointURL: '/graphql'
    }));

    app.listen(PORT, () => {
      console.log(`Visit ${URL}:${PORT}${homePath}`);
    });

  } catch (e) {
    console.log(e);
  }
}
