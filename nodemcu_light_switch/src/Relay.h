#ifndef _relay_h_
#define _relay_h_

#include "Configuration.h"

class Relay
{
private:
  unsigned int pin;

public:
  int state;
  bool active;
  double offMaxAmpsThreshold;  //max AmpsRMS when light is switced off
  double onMinAmpsThreshold;   //min AmpsRMS when light is switced on


  Relay( unsigned int _pin, int _state, double _offMaxAmpsThreshold, double _onMinAmpsThreshold )
  {
    pin = _pin;
    state = _state;
    active = true;
    offMaxAmpsThreshold = _offMaxAmpsThreshold;
    onMinAmpsThreshold = _onMinAmpsThreshold;
  }

  void setup( const Configuration& configuration );
  int toggle();
  int on();
  int off();
  void activate();
  void deactivate();
};

#endif
