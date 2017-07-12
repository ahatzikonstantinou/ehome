# ehome
Platform for home automation. It is based on mqtt for sending and receiving data, as well as http for adding cameras (it supports webcam streams, as well as the motion software https://github.com/Motion-Project/motion. It's unique features are that it is multilingual, it supports multiple house installations (the web app can communicate with multiple mqtt brokers and retrieve house configurations), house configurations are live reloaded whenever the house-configuration changes. It includes a web app designed for mobile devices, a minimalistic alarm panel, email and instant messages (xmpp) notifications. In development: GSM notifications (sms, phonecall), mqtt over xmpp proxies for installations with GSM network but no land-internet, settings form in the web app, scenes, client ssl certificates for authentication, etc.
