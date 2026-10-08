typedef unsigned char uint8_t;typedef unsigned char byte;
extern "C" {
__attribute__((import_module("env"),import_name("clear"))) void clear();
__attribute__((import_module("env"),import_name("rect"))) void rect(int,int,int,int,int,int);
__attribute__((import_module("env"),import_name("triangle"))) void triangle(int,int,int,int,int,int,int);
__attribute__((import_module("env"),import_name("rand"))) int randn(int);
}
unsigned long clock_ms=0;unsigned long millis(){return clock_ms;}int random(int n){return randn(n);}
struct Display{void clearDisplay(){clear();}void display(){}void fillRoundRect(int x,int y,int w,int h,int r,int c){rect(x,y,w,h,r,c);}void fillTriangle(int x,int y,int x2,int y2,int x3,int y3,int c){triangle(x,y,x2,y2,x3,y3,c);}};
#include "FluxGarage_RoboEyes.h"
Display d;RoboEyes<Display> eyes(d);
extern "C" {
void init(){eyes.begin(160,100,30);eyes.setWidth(46,46);eyes.setHeight(50,50);eyes.setBorderradius(15,15);eyes.setSpacebetween(20);eyes.setAutoblinker(true,3,2);eyes.setIdleMode(true,4,2);eyes.setCuriosity(true);eyes.setPosition(DEFAULT);eyes.open();}
void tick(int t){clock_ms=t;eyes.update();}
void mood(int v){eyes.setMood(v);}
void gaze(int x,int y){eyes.setIdleMode(false);eyes.eyeLxNext=eyes.getScreenConstraint_X()*x/1000;eyes.eyeLyNext=eyes.getScreenConstraint_Y()*y/1000;}
void idle(int on){eyes.setIdleMode(on!=0,4,2);}
void action(int n){if(n==0)eyes.blink();if(n==1)eyes.anim_laugh();if(n==2)eyes.anim_confused();}
void sweat(int on){eyes.setSweat(on!=0);}
}
