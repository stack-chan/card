import main from '@/assets/robots/robot-main.png'
import happy from '@/assets/robots/robot-happy.png'
import heart from '@/assets/robots/robot-heart.png'
import neutralTop from '@/assets/robots/robot-neutral-top.png'
import sleepBottom from '@/assets/robots/robot-sleep-bottom.png'
import squint from '@/assets/robots/robot-squint.png'
import sleep from '@/assets/robots/robot-sleep.png'
import wink from '@/assets/robots/robot-wink.png'
import neutral from '@/assets/robots/robot-neutral.png'
import playful from '@/assets/robots/robot-playful.png'
export const ROBOTS = { main, happy, heart, neutralTop, sleepBottom, squint, sleep, wink, neutral, playful }
export type RobotId = keyof typeof ROBOTS
