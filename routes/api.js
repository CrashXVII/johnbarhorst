const router = require('express').Router();
const fetch = require('node-fetch');
const db = require('better-sqlite3')('./database.sqlite3', { readonly: true });
require('dotenv').config();
const APIKEY = process.env.APIKEY;

// Hash converter for sqlite look ups
const convertHash = hash => {
  let x = parseInt(hash);
  if (x > 0xFFFFFFFF) {
    console.error('Too big, must have a wrong number');

  }
  if (x > 0x7FFFFFFF) {
    x = 0x100000000 - x;
    if (x < 2147483648) {
      return -x
    }
    else {
      return -2147483648
    }
  }
  return x;
}

const getFromDB = async (hash, table) => {
  return await new Promise(resolve => {
    const stmt = db.prepare(`SELECT json FROM ${table} WHERE id = ?`);
    const result = stmt.get(convertHash(hash));
    if (result) {
      resolve(JSON.parse(result.json));
    } else {
      resolve({ error: `${hash} not found in ${table}` });
    }
  })
}

const headers = {
  "X-API-KEY": APIKEY,
}

function checkStatus(res) {
  // Bungie has a ton of ErrorCode possibilities, 1 = success!
  if (res.ErrorCode === 1) {
    return true
  } else {
    return false;
  }
}

const getItemDetails = async (item) => { };

const getStatsDetails = async stats => {
  const hashArray = Array.from(Object.keys(stats));
  const statsDefinitions = await Promise.all(hashArray.map(async hash => {
    const details = await getFromDB(hash, 'DestinyStatDefinition');
    return details;
  }));
  return statsDefinitions;
};

const processCharacters = async (characterData) => {
  const classTypeRef = ["Titan", "Hunter", "Warlock"];
  const genderTypeRef = ["Male", "Female"];
  const raceTypeRef = ["Human", "Awoken", "Exo"];
  const characterArray = Array.from(Object.values(characterData));
  const charactersWithDetails = await Promise.all(characterArray.map(async character => {
    const statsWithDetails = await getStatsDetails(character.stats);
    return {
      membershipId: character.membershipId,
      membershipType: character.membershipType,
      characterId: character.characterId,
      dateLastPlayed: character.dateLastPlayed,
      minutesPlayedThisSession: character.minutesPlayedThisSession,
      minutesPlayedTotal: character.minutesPlayedTotal,
      light: character.light,
      race: raceTypeRef[character.raceType],
      gender: genderTypeRef[character.genderType],
      class: classTypeRef[character.classType],
      emblemPath: `https://www.bungie.net${character.emblemPath}`,
      titleRecordHash: character.titleRecordHash,
      statsWithDetails: statsWithDetails
    }
  }))
  return charactersWithDetails;
};

router.use('/manifest', async (req, res, next) => {
  const paths = await fetch('https://www.bungie.net/Platform/Destiny2/Manifest', { headers }).then(res => res.json());
  const dbPath = `https://www.bungie.net${paths.Response.mobileWorldContentPaths.en}`;
  res.redirect(dbPath);
});


router.use('/search/:displayName', async (req, res, next) => {
  const searchQuery = await fetch(
    `https://www.bungie.net/Platform/Destiny2/SearchDestinyPlayer/All/${req.params.displayName}/`,
    { headers }).then(res => res.json());
  const responseStatus = checkStatus(searchQuery);
  if (responseStatus) {
    const accountList = {
      status: 200,
      accounts: searchQuery.Response
    };
    res.send(JSON.stringify(accountList));
  } else {
    res.send(JSON.stringify(searchQuery.Message));
  }
});

router.use('/characters/:membershipType/:membershipId', async (req, res, next) => {
  const accountData = await fetch(
    `https://www.bungie.net/Platform/Destiny2/${req.params.membershipType}/Profile/${req.params.membershipId}/?components=100,104,200,205,300,304,305,1100`,
    { headers }).then(res => res.json());
  const responseStatus = checkStatus(accountData);
  if (responseStatus) {
    const characterData = accountData.Response.characters.data;
    const characters = await processCharacters(characterData);
    const profileInfo = {
      status: 200,
      profileData: accountData.Response,
      test: 'test',
      characters: characters

    };
    res.send(JSON.stringify(profileInfo));
  } else {
    res.send(JSON.stringify(accountData.Message));
  }
});

module.exports = router;