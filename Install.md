git clone git@github.com:as19git67/fireportalserver.git
cd fireportalserver
npm install
cp settings.example.json settings.json
chmod 600 settings.json
cp staff.example.json staff.json
chmod 600 staff.json

In staff.json groupId auf 21204 setzen (Diese Gruppe ist hardcoded für die Auswahl einer Person)

openssl req -newkey rsa:2048 -new -nodes -x509 -days 3650 -keyout key.pem -out cert.pem

# Start server im dev Modus (damit kann als Code 000000 verwendet werden)
NODE_ENV=development node server.js


==> wenn der Server läuft, erhält man folgende Ausgabe:

> fireportalserver@1.0.1 start
> node ./server.js

watchForConfigChange started
Starting websockets server...
Firealarm Portal Server https server listening on port 5055
Firealarm Portal Server http server listening on port 5005


CLIENT:
=======

git clone git@github.com:as19git67/firemonui2.git
cd firemonui2
npm install
npm run serve

Im browser: http://localhost:8080
In der angezeigten Seite muss im Header "Development Mode" stehen.
Das Person-Icon mit dem Plus anklicken um einen neuen Benutzer anzulegen. Username und Passwort eingeben.

Der Server möchte nun eine Email-Confirmation versenden. Das funktioniert nur, wenn in server.json die Email Einstellungen vorgenommen wurden.

Falls man den Server nur zum Entwickeln benötigt, kann man, nachdem der neue User in user.json durch den Server eingetragen wurde, einige
Einstellungen manuell vornehmen:
state: provisioned
canRead: true
canWrite: true
isAdmin: true
expiredAfter: 2026-....
accessTokenExpiresAfter: 2026-....

Nach dem Neustarten des Servers mit ...
