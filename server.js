const express = require('express');
const path = require("path");
const clientSessions = require("client-sessions");
const authData = require("./modules/auth-service");
const siteData = require("./modules/data-service");
const app = express();

const HTTP_PORT = process.env.PORT || 8080;

// Static Files and Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');

// Sessions
app.use(clientSessions({
  cookieName: "session",
  secret: "randomSecretHere123",
  duration: 2 * 60 * 1000,
  activeDuration: 1 * 60 * 1000
}));

// Share session with views
app.use((req, res, next) => {
  res.locals.session = req.session;
  next();
});

// Ensure Login Middleware
function ensureLogin(req, res, next) {
  if (!req.session.user) {
    res.redirect("/login");
  } else {
    next();
  }
}

// Routes
app.get('/', (req, res) => res.render("home"));

app.get('/about', (req, res) => res.render("about"));

app.get("/sites", async (req, res) => {
  try {
    let sites = [];
    if (req.query.region) {
      sites = await siteData.getSitesByRegion(req.query.region);
    } else if (req.query.provinceOrTerritory) {
      sites = await siteData.getSitesByProvinceOrTerritoryName(req.query.provinceOrTerritory);
    } else {
      sites = await siteData.getAllSites();
    }
    res.render("sites", { sites });
  } catch (err) {
    res.status(404).render("404", { message: err });
  }
});

app.get("/sites/:id", async (req, res) => {
  try {
    const site = await siteData.getSiteById(req.params.id);
    res.render("site", { site });
  } catch (err) {
    res.status(404).render("404", { message: err });
  }
});

app.get("/addSite", ensureLogin, async (req, res) => {
  const provincesAndTerritories = await siteData.getAllProvincesAndTerritories();
  res.render("addSite", { provincesAndTerritories });
});

app.post("/addSite", ensureLogin, async (req, res) => {
  try {
    await siteData.addSite(req.body);
    res.redirect("/sites");
  } catch (err) {
    res.render("500", { message: `Error: ${err}` });
  }
});

app.get("/editSite/:id", ensureLogin, async (req, res) => {
  try {
    const site = await siteData.getSiteById(req.params.id);
    const provincesAndTerritories = await siteData.getAllProvincesAndTerritories();
    res.render("editSite", { site, provincesAndTerritories });
  } catch (err) {
    res.status(404).render("404", { message: err });
  }
});

app.post("/editSite", ensureLogin, async (req, res) => {
  try {
    await siteData.editSite(req.body.siteId, req.body);
    res.redirect("/sites");
  } catch (err) {
    res.render("500", { message: `Error: ${err}` });
  }
});

app.get("/deleteSite/:id", ensureLogin, async (req, res) => {
  try {
    await siteData.deleteSite(req.params.id);
    res.redirect("/sites");
  } catch (err) {
    res.status(500).render("500", { message: `Error: ${err}` });
  }
});

// Register/Login/Logout Routes
app.get("/register", (req, res) => {
  res.render("register");
});

app.post("/register", (req, res) => {
  req.body.userAgent = req.get("User-Agent");

  authData.registerUser(req.body).then(() => {
    res.render("register", { successMessage: "User created" });
  }).catch((err) => {
    res.render("register", { errorMessage: err, userName: req.body.userName });
  });
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.post("/login", (req, res) => {
  req.body.userAgent = req.get("User-Agent");

  authData.checkUser(req.body).then((user) => {
    req.session.user = {
      userName: user.userName,
      email: user.email,
      loginHistory: user.loginHistory
    };
    res.redirect("/sites");
  }).catch((err) => {
    res.render("login", { errorMessage: err, userName: req.body.userName });
  });
});

app.get("/logout", (req, res) => {
  req.session.reset();
  res.redirect("/");
});

// 404 Handler
app.use((req, res) => {
  res.status(404).render("404", { message: "I'm sorry, we're unable to find what you're looking for" });
});

// Start the server
siteData.initialize()
  .then(authData.initialize)
  .then(() => {
    app.listen(HTTP_PORT, () => {
      console.log(`server listening on: ${HTTP_PORT}`);
    });
  })
  .catch((err) => {
    console.log(`unable to start server: ${err}`);
  });
