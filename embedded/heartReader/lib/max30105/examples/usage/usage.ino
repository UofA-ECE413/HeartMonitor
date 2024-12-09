// Example usage for max30105 library by Nathan Seidle.

#include "max30105.h"

// Initialize objects from the lib
Max30105 max30105;

void setup() {
    // Call functions on initialized library objects that require hardware
    max30105.begin();
}

void loop() {
    // Use the library's initialized objects and functions
    max30105.process();
}
