#ifndef _relay_h_
#define _relay_h_

class Relay
{
private:
  unsigned int pin;

public:
  int state;
  bool active;

  Relay( unsigned int _pin, int _state )
  {
    pin = _pin;
    state = _state;
    active = true;
  }
  void setup();
  int toggle();
  int on();
  int off();
  void activate();
  void deactivate();
};

#endif
