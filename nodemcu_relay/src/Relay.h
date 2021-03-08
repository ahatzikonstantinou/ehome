#ifndef _relay_h_
#define _relay_h_


class Relay
{
private:
  unsigned int pin;

public:
  int state;


  Relay( unsigned int _pin, int _state )
  {
    pin = _pin;
    state = _state;
  }

  void setup();
  int toggle();
  int on();
  int off();
  bool isOn();
};

#endif
