let tl = gsap.timeline({ repeat: -1 })

for (let i = 1; i <= 60; i++) {
  tl.to('.hand-center', {
    rotation: i * 6,
    duration: 1,
    ease: 'none',
  })
}

document.querySelector('#skip10s').onclick = () => {
  tl.totalTime(tl.totalTime() + 10)
}
