#ifndef _relay_h_
#define _relay_h_

class Relay
{
public:
  static int state;

  static void setup();
  static int toggle();
  static int on();
  static int off();
};

#endif
