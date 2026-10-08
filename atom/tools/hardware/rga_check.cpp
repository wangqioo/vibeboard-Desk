#include <rga/rga.h>

#include <rga/im2d.h>
#include <cstdio>
#include <cstdlib>
#include <chrono>
int main(){int w=1280,h=720,dw=480,dh=360;unsigned char *src=nullptr,*dst=nullptr;size_t ss=((w*h*4+4095)/4096)*4096,ds=((dw*((dh+15)&~15)*4+4095)/4096)*4096;if(posix_memalign((void**)&src,4096,ss)||posix_memalign((void**)&dst,4096,ds))return 3;for(int i=0;i<w*h;i++){src[i*4]=80;src[i*4+1]=160;src[i*4+2]=220;src[i*4+3]=255;}rga_buffer_t a=wrapbuffer_virtualaddr(src,w,h,RK_FORMAT_RGBA_8888),b=wrapbuffer_virtualaddr(dst,dw,dh,RK_FORMAT_RGBA_8888,dw,((dh+15)&~15));auto start=std::chrono::steady_clock::now();for(int i=0;i<100;i++){IM_STATUS ret=imresize(a,b);if(ret!=IM_STATUS_SUCCESS){printf("RGA failed: %s\n",imStrError(ret));return 1;}}double ms=std::chrono::duration<double,std::milli>(std::chrono::steady_clock::now()-start).count();printf("RGA 100 resize operations %.2fms; output %d,%d,%d,%d\n",ms,dst[0],dst[1],dst[2],dst[3]);int ok=1;for(int i=0;i<dw*dh;i++){if(dst[i*4]!=80||dst[i*4+1]!=160||dst[i*4+2]!=220){ok=0;break;}}printf("Full output pixel validation: %s\n",ok?"passed":"failed");free(src);free(dst);return ok?0:2;}
