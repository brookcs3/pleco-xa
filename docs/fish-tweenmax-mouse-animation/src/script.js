//Design by Abhishek Rana
//https://www.uplabs.com/posts/fishery-online-store-web


$(document).ready(function (){
  var main_bg = $('.main_bg'),
      header = $('.header');
  el = $('.fish'),
    nav_list = $('.nav_list li'),
    letter1 = $('.letter1'),
    letter2 = $('.letter2'),
    letter3 = $('.letter3'),
    letter4 = $('.letter4'),
    letter5 = $('.letter5');

  TweenMax.set(el, { x: '-50%', y: '-50%',transformStyle: 'preserve-3d' });
  TweenMax.set([letter1, letter2, letter3, letter4, letter5], { transformStyle: 'preserve-3d' });

  main_bg.on('mousemove', function (e){
    var sxPos = e.pageX / $(this).width() * 100 - 50;
    var syPos = e.pageY / $(this).height() * 100 - 50;

    TweenMax.to(el, 2, {
      x: -sxPos * .6,
      y: -syPos * .6,
      transformPerspective: 500,
      ease: Expo.easeOut
    });
    TweenMax.to(letter1, 2, {
      x: -sxPos * .5,
      y: -syPos * .5,
      transformPerspective: 500,
      ease: Expo.easeOut
    });
    TweenMax.to(letter2, 2, {
      x: -sxPos * .4,
      y: -syPos * .4,
      transformPerspective: 500,
      ease: Expo.easeOut
    });
    TweenMax.to(letter3, 2, {
      x: -sxPos * .3,
      y: -syPos * .3,
      transformPerspective: 500,
      ease: Expo.easeOut
    });
    TweenMax.to(letter4, 2, {
      x: -sxPos * .2,
      y: -syPos * .2,
      transformPerspective: 500,
      ease: Expo.easeOut
    });
    TweenMax.to(letter5, 2, {
      x: -sxPos * .1,
      y: -syPos * .1,
      transformPerspective: 500,
      ease: Expo.easeOut
    });

  });

  var tl = new TimelineMax();
  $(window).on('load', function (){
    tl.fromTo(header, 1, {
      y:"-200px"
    }, {
      y:"0px",  ease:Expo.easeOut
    }).staggerTo(nav_list, 1, 
                 {
      ease: Power4.easeOut,
      y: "0px"
    }, .2);
  });

});
       