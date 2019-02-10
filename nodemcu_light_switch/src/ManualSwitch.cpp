#include "ManualSwitch.h"
#include "CheckAmps.h"
#include "MeasureAmps.h"

ManualSwitch::ManualSwitch( Relay& _relay, MQTT &_mqtt, SINGLETRIGGER_CALLBACK_SIGNATURE, DOUBLETRIGGER_CALLBACK_SIGNATURE )
{
  relay = &_relay;
  mqtt = &_mqtt;
  this->single_trigger_callback = single_trigger_callback;
  this->double_trigger_callback = double_trigger_callback;
  last_trigger = 0;
}

void ManualSwitch::setup()
{
  last_trigger = millis();
}

void ManualSwitch::loop( bool firstRun )
{
  static double lastAmps = 0;
  // check Amp and toggle relay accordingly
  double currentAmps = getAmpsRMS();
  if( !firstRun )
  {
    if( ( relay->state == HIGH && currentAmps > relay->offMaxAmpsThreshold) || //transition from OFF to ON
        ( relay->state == LOW && currentAmps < relay->onMinAmpsThreshold )   //transition from ON to OFF
      )
    {
      // current will jump high once when pressing the pushbutton and also when switching on the light (/relay)
      // switch only if current jumps high ### millisecs AFTER the last jump, in order to ignore spikes due to light switching on
      uint32_t trigger_t = millis();
      if( trigger_t > last_trigger + MIN_TRIGGER_MILLIS )
      {
        if( trigger_t < last_trigger + MAX_TWO_TRIGGER_MILLIS )
        {
          double_trigger_callback( relay );
          // toggleOperationMode();
          Serial.println( "Double valid trigger" );
        }
        else
        {
          // relay->toggle();
          single_trigger_callback( relay );

          // CheckAmps c = setRelay( relay->state == HIGH ? true : false );// relay->toggle(); //toggleRelay();
          // trigger = TRIGGER_MANUAL;
          // if( operation_mode == OPERATION_MANUAL_WIFI )
          // {
          //   mqtt->publishReport( relay->state, relay->active, triggerToStr(), *offMaxAmpsThreshold, *onMinAmpsThreshold, c );
          // }
        }
        last_trigger = trigger_t;
        Serial.print( "   Trigger: " );
      }
      else
      {
        Serial.print( "   Ignored trigger: " );
      }

      Serial.print( ", lastAmps = " + String( lastAmps ) );
      Serial.println( ", currentAmps = " + String( currentAmps ) );
    }
  }
  lastAmps = currentAmps;
}
