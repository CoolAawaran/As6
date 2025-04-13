// const siteData = require("../data/NHSiteData");
// const provinceAndTerritoryData = require("../data/provinceAndTerritoryData");
// let sites = [];

require('dotenv').config();

require('pg'); // explicitly require the "pg" module for deploying to vercel.com
const Sequelize = require('sequelize');

// set up sequelize to point to our postgres database
let sequelize = new Sequelize(process.env.DB_DATABASE, process.env.DB_USER, process.env.DB_PASSWORD, {
  host: process.env.DB_HOST,
  dialect: 'postgres',
  port: 5432,
  dialectOptions: {
    ssl: { rejectUnauthorized: false },
  }
});


// ProvinceOrTerritory model

const ProvinceOrTerritory = sequelize.define(
  'ProvinceOrTerritory',
  {
    code: {
      type: Sequelize.STRING,
      primaryKey: true, // use "code" as a primary key
      // autoIncrement: true, // automatically increment the value
    },
    name: Sequelize.STRING,
    type: Sequelize.STRING,
    region: Sequelize.STRING,
    capital: Sequelize.STRING
  },
  {
    createdAt: false, // disable createdAt
    updatedAt: false, // disable updatedAt
  }
);

// Site model

const Site = sequelize.define(
  'Site',
  {
    siteId: {
      type: Sequelize.STRING,
      primaryKey: true, // use "id" as a primary key
    },
    site: Sequelize.STRING,
    "description": Sequelize.TEXT,
    "date": Sequelize.INTEGER,
    "dateType": Sequelize.STRING,
    "image": Sequelize.STRING,
    "location": Sequelize.STRING,
    "latitude": Sequelize.FLOAT,
    "longitude": Sequelize.FLOAT,
    "designated": Sequelize.INTEGER,
    "provinceOrTerritoryCode": Sequelize.STRING,
  },
  {
    createdAt: false, // disable createdAt
    updatedAt: false, // disable updatedAt
  }
);

Site.belongsTo(ProvinceOrTerritory, {foreignKey: 'provinceOrTerritoryCode'})


// Note, extra wrapper promises added for simplicity and greater control over error messages

function initialize() { 
  return new Promise(async (resolve, reject) => {
    try{
      await sequelize.sync();
      resolve();
    }catch(err){
      reject(err.message)
    }
  });
}

function getAllSites() {

  return new Promise(async (resolve,reject)=>{
    let sites = await Site.findAll({include: [ProvinceOrTerritory]});
    // console.log("sites[0]:", sites[0])
    resolve(sites.map(c => c.dataValues));
  });

}

function getSiteById(id) {

  return new Promise(async (resolve, reject) => {
    let foundSite = await Site.findAll({include: [ProvinceOrTerritory], where: { siteId: id}});
 
    if (foundSite.length > 0) {
      resolve(foundSite[0].dataValues);
    } else {
      reject("Unable to find requested site");
    }
  });

}

function getSitesByProvinceOrTerritoryName(provinceOrTerritory) {

  return new Promise(async (resolve, reject) => {
    let foundSites = await Site.findAll({include: [ProvinceOrTerritory], where: { 
      '$ProvinceOrTerritory.name$': {
        [Sequelize.Op.iLike]: `${provinceOrTerritory}%`
      }
    }});
 
    if (foundSites.length > 0) {
      resolve(foundSites.map(r => r.dataValues));
    } else {
      reject("Unable to find requested sites");
    }

  });

}

function getSitesByRegion(region) {

  return new Promise(async (resolve, reject) => {
    let foundSites = await Site.findAll({include: [ProvinceOrTerritory], where: { 
      '$ProvinceOrTerritory.region$': region 
    }});
 
    if (foundSites.length > 0) {
      resolve(foundSites.map(r => r.dataValues));
    } else {
      reject("Unable to find requested sites");
    }
  });
}

function addSite(siteData){
  return new Promise(async (resolve,reject)=>{
    try{
      // siteData.landlocked = siteData.landlocked ? true : false;
      await Site.create(siteData);
      resolve();
    }catch(err){
      reject(err.message); // reject(err.errors[0].message);
    }
  });
}

function editSite(id, siteData){

  return new Promise(async (resolve,reject)=>{
    try {
      console.log("siteData:", siteData);
      await Site.update(siteData,{where: {siteId: id}})
      resolve();
    }catch(err){
      reject(err.message); // reject(err.errors[0].message);
    }
  });
}

function deleteSite(id){
  return new Promise(async (resolve,reject)=>{
    try{
      await Site.destroy({
        where: { siteId: id }
      });
      resolve();
    }catch(err){
      reject(err.message); // reject(err.errors[0].message);
    }
   
  });
  
}

function getAllProvincesAndTerritories() {

  return new Promise(async (resolve,reject)=>{
    let provincesAndTerritories = await ProvinceOrTerritory.findAll();
    resolve(provincesAndTerritories.map(r => r.dataValues));
  });
   
}

module.exports = { 
  initialize, getAllSites, getSiteById, getSitesByRegion, 
  getSitesByProvinceOrTerritoryName, getAllProvincesAndTerritories, addSite, editSite,deleteSite 
}

