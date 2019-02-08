#ifndef _buzzer_h_
#define _buzzer_h_

class Buzzer
{
public:
  static void setup();
  static void play( unsigned int frequency, uint32_t duration );
  static void playStart();
  static void playSetupFinished();
  static void playRestart();
  static void playWifiPortalStart();
  static void playWifiConnected();
  static void playMQTTConnected();
  static void playMQTTDisconnected();
};

#endif
