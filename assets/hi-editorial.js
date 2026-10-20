/* HiParcelo / calm motion, resilient progressive enhancement */
(() => {
  "use strict";
  const doc=document.documentElement;
  const reduce=window.matchMedia("(prefers-reduced-motion: reduce)");
  let observer=null,globalReady=false;
  const seen=new WeakSet();
  const reveal=(root=document)=>{
    const all=root.querySelectorAll("[data-hi-reveal]");
    if(reduce.matches || !("IntersectionObserver" in window)) { all.forEach(el=>el.classList.add("hi-visible"));return; }
    if(!observer)observer=new IntersectionObserver(entries=>{
      entries.forEach(e=>{
        if(e.isIntersecting){e.target.classList.add("hi-visible");observer.unobserve(e.target);}
      });
    },{threshold:.07,rootMargin:"0px 0px -40px 0px"});
    all.forEach(el=>{
      if(seen.has(el))return;
      seen.add(el);
      if(el.getBoundingClientRect().top<window.innerHeight*.92)el.classList.add("hi-visible");
      observer.observe(el);
    });
    doc.classList.add("hi-motion-ready");
  };
  function nav(){
    const header=document.querySelector(".hi-header");
    if(!header)return;
    let raf=0;
    const update=()=>{
      raf=0;
      header.classList.toggle("hi-has-scrolled",window.scrollY>18);
    };
    const onScroll=()=>{if(!raf)raf=requestAnimationFrame(update)};
    update();window.addEventListener("scroll",onScroll,{passive:true});
    document.addEventListener("click",event=>{
      document.querySelectorAll(".hi-mobile[open]").forEach(menu=>{
        if(!menu.contains(event.target))menu.open=false;
        else if(event.target.closest("a"))menu.open=false;
      });
    });
    document.addEventListener("keydown",event=>{
      if(event.key!=="Escape")return;
      document.querySelectorAll(".hi-mobile[open]").forEach(menu=>{
        menu.open=false;menu.querySelector("summary")?.focus();
      });
    });
  }
  function accordion(root=document){
    root.querySelectorAll(".hi-method__accordions").forEach(container=>{
      if(container.dataset.hiReady)return;container.dataset.hiReady="1";
      container.querySelectorAll("details").forEach(details=>{
        details.addEventListener("toggle",()=>{
          if(!details.open)return;
          container.querySelectorAll("details").forEach(other=>{if(other!==details)other.open=false;});
        });
      });
    });
  }
  function init(root=document){reveal(root);accordion(root);if(!globalReady){globalReady=true;nav();reduce.addEventListener?.("change",()=>{
    if(reduce.matches){observer?.disconnect();observer=null;doc.classList.remove("hi-motion-ready");document.querySelectorAll("[data-hi-reveal]").forEach(el=>el.classList.add("hi-visible"));}
  });}}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>init(),{once:true});
  else init();
  document.addEventListener("shopify:section:load",event=>init(event.target));
})();