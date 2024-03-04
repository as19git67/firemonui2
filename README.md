# firemonui2
firemonui2 is the second version of a vue based client for the
fireportalserver.
It is used in the fire department to display alarm data and when
the "job" has been finished it is used to enter additional
information about how the job has been serviced.
For example the attending personell, the used material and
other data can be entered and reviewed later.

For security and privacy reasons, the job-data can be encrypted and only
users with permissions can decrypt and view the data again.


## Project setup
```
npm install
```

### Compiles and hot-reloads for development
```
npm run serve
```

### Compiles and minifies for production
```
npm run build
```
When the build succeeded, the dist directory must be copied to the
fireportalserver. The server will serve the files from dist/* as
static files to allow the browser to load the client app.

### Lints and fixes files
```
npm run lint
```

### Customize configuration

