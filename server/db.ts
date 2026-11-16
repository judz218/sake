import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
const path=process.env.DB_PATH || resolve('data/sake.sqlite');
if(path!==':memory:') mkdirSync(dirname(path),{recursive:true});
export const db=new DatabaseSync(path);
db.exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;
CREATE TABLE IF NOT EXISTS migrations(version INTEGER PRIMARY KEY);
CREATE TABLE IF NOT EXISTS sakes(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,brewery TEXT NOT NULL DEFAULT '',prefecture TEXT NOT NULL DEFAULT '',designation TEXT NOT NULL DEFAULT '',classifications TEXT NOT NULL DEFAULT '',officialDescription TEXT NOT NULL DEFAULT '',sourceUrl TEXT NOT NULL DEFAULT '',nihonshudo REAL,acidity REAL,officialDryness REAL,officialRichness REAL,officialBasis TEXT NOT NULL DEFAULT '',sample INTEGER NOT NULL DEFAULT 0,createdAt TEXT NOT NULL,updatedAt TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS records(id INTEGER PRIMARY KEY AUTOINCREMENT,sakeId INTEGER NOT NULL REFERENCES sakes(id) ON DELETE RESTRICT,date TEXT NOT NULL,dryness REAL,richness REAL,aroma TEXT NOT NULL DEFAULT '',rating INTEGER,tags TEXT NOT NULL DEFAULT '[]',memo TEXT NOT NULL DEFAULT '',place TEXT NOT NULL DEFAULT '',sample INTEGER NOT NULL DEFAULT 0,createdAt TEXT NOT NULL,updatedAt TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS records_sake ON records(sakeId);
INSERT OR IGNORE INTO migrations VALUES(1);`);
export function transaction<T>(fn:()=>T):T {db.exec('BEGIN IMMEDIATE');try{const result=fn();db.exec('COMMIT');return result;}catch(e){db.exec('ROLLBACK');throw e;}}
