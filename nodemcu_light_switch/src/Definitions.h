#ifndef _definitions_h_
#define _definitions_h_

#define TRIGGER_MANUAL 0
#define TRIGGER_WIFI 1
#define TRIGGER_CALIBRATION 2
#define TRIGGER_CHECK 3

// The switch may work in manual_only or manual_wifi mode. manual_only is for when there is no wifi or mqtt infrastructure
// but the switch should still work at least manually
#define OPERATION_MANUAL_ONLY 0
#define OPERATION_MANUAL_WIFI 1

#endif
