#!/usr/bin/env python3
"""Produce mobile-first WEAVE outlet training video with licensed narration.
The narration file is provided to the script at runtime; no signed asset URLs
are stored in this Python source.
"""
import os, subprocess, math
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public'/'training'
OUT.mkdir(parents=True,exist_ok=True)
WORK=Path(os.getenv('WEAVE_TRAINING_TMP','/tmp/weave-training'))
WORK.mkdir(parents=True,exist_ok=True)
AUDIO=Path(os.getenv('WEAVE_TRAINING_AUDIO',WORK/'narration.mp3'))
if not AUDIO.exists():raise SystemExit("Narration audio is required")
def command(*args): subprocess.run(args,check=True)
def output(*args): return subprocess.check_output(args,text=True).strip()
DUR=float(output('ffprobe','-v','error','-show_entries','format=duration','-of','default=nw=1:nk=1',str(AUDIO)))
WIDTH,HEIGHT=720,1280
BOLD='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
REG='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
def ft(sz,bold=False):return ImageFont.truetype(BOLD if bold else REG,sz)
def lines(draw,text,max_width,size,weight=True):
    words=text.split(); rows=[]; line=''
    f=ft(size,weight)
    for word in words:
        candidate=(line+' '+word).strip()
        if line and draw.textlength(candidate,font=f)>max_width:
            rows.append(line);line=word
        else:line=candidate
    if line: rows.append(line)
    return rows
def put(draw,text,x,y,size,color='#f3f5f9',width=630,line_height=None,bold=True):
    for line in lines(draw,text,width,size,bold):
        draw.text((x,y),line,font=ft(size,bold),fill=color)
        y+=(line_height or size+15)
    return y
scenes=[
 ("STABILITY · WEAVE", "DAILY OUTLET SUPPLY",
  "WEAVE Agents build their business by supplying real stores, not opening new stores.",
  "One Agent · Active shops · Daily restock"),
 ("01 · DISCOVER", "VISIT WORKING STORES",
  "Approach an existing mini mart, canteen or food outlet. Find out when customers buy, who orders stock and how prepared food is kept fresh.",
  "Observe first. Listen first."),
 ("02 · APPROACH", "ASK THE OWNER",
  "Good morning. I'm a WEAVE food Agent. Which food moves fastest in your shop, and when do customers come? May I show you our food combinations?",
  "One genuine conversation."),
 ("03 · PRODUCTS", "SHOW THE RIGHT PRODUCT",
  "AGILITY  · Morning package · ₦4,000\nELECTROLYTE SMALL · ₦4,000\nELECTROLYTE MEDIUM · ₦6,000\nEMBER SMALL · ₦6,000\nEMBER LARGE · ₦12,000\nDAISY · Per cake order",
  "Every product has its own purpose."),
 ("04 · PRICING", "AGENT PRICE = WEAVE PRICE",
  "An Agent supplies individuals and independent stores at the official WEAVE price. The store sets its own higher resale price and keeps that added margin.",
  "Store markup stays with the store."),
 ("05 · EXAMPLE", "ONE AGILITY CARTON",
  "AGENT BUYS 10 PACKS       ₦30,000\nAGENT SUPPLIES STORE      ₦40,000\nAGENT GROSS MARGIN       ₦10,000\n\nStore example: 10 × ₦5,000 = ₦50,000; store gross margin ₦10,000 before costs.",
  "Examples are not promised profits."),
 ("06 · FIRST ORDER", "START SMALL. REPEAT.",
  "Offer 5 packs (half-carton) or 10 packs (one carton). Choose PAID NOW or PAY AFTER SALE, and record the amount owed and collection date.",
  "No unrecorded stock. No false demand."),
 ("07 · THE APP", "OPEN AGENT DISTRIBUTION",
  "Register the outlet. Order cartons. Pay WEAVE. Wait for Administration verification and preparation. Confirm receipt. Supply at the automatic WEAVE price. Record stock and collections.",
  "Agents use the WEAVE app. Shops stay independent."),
 ("08 · THE ROUTE", "FOLLOW EACH OUTLET",
  "MORNING · Agility\nMIDDAY · Electrolyte Small ₦4,000 / Medium ₦6,000\nEVENING · Ember\nDAILY · Count sales, collect funds and check freshness",
  "Restock what really sells."),
 ("09 · CONTINUE", "BUILD DAILY STABILITY",
  "Build trust, keep honest records, and revisit outlets. Regular carton orders should come from real customer demand and safe food preparation capacity.",
  "NOTICE → RECOGNIZE → SOLVE → MOVE")
]
weights=[8,13,11,21,13,18,14,21,21,13]
total=sum(weights);durations=[DUR*w/total for w in weights]
# Keep the last frame alive until the narration finishes.
durations[-1]=DUR-sum(durations[:-1])+0.6
for idx,((category,title,body,footer),seconds) in enumerate(zip(scenes,durations)):
    im=Image.new('RGB',(WIDTH,HEIGHT))
    pix=im.load()
    for y in range(HEIGHT):
        t=y/HEIGHT
        col=(int(7+20*t),int(19+7*t),int(27+4*t))
        for x in range(WIDTH):pix[x,y]=col
    d=ImageDraw.Draw(im)
    d.rounded_rectangle((36,36,684,125),radius=23,fill='#112b31',outline='#42686e',width=2)
    d.text((60,57),'WEAVE  /  AGENT STABILITY',font=ft(27,True),fill='#7ff0d6')
    d.text((43,177),category,font=ft(29,True),fill='#ffab68')
    y=252
    y=put(d,title,43,y,51,'#ffffff',630,69)
    y+=48
    d.rounded_rectangle((43,max(y,435),677,1015),radius=28,fill='#163039',outline='#416b72',width=3)
    start=max(y+47,495)
    small=29 if idx in (3,5,7,8) else 35
    line_height=63 if idx in (3,5,7,8) else 56
    # Bullet-like multiline inside group
    for para in body.split('\n'):
        start=put(d,para,70,start,small,'#f0f4f6',574,line_height,False)
        start+=10 if idx==5 else 6
    d.rounded_rectangle((43,1060,677,1155),radius=18,fill='#44291e')
    put(d,footer,62,1081,25,'#ffd29f',582,31)
    d.rounded_rectangle((44,1198,44+int(634*(idx+1)/10),1208),radius=5,fill='#fe8742')
    d.text((44,1235),'WEAVE OF PRESENCE · AGENT WORK',font=ft(19,True),fill='#a6c9cd')
    png=WORK/f'slide_{idx:02d}.png';im.save(png)
    mp4=WORK/f'slide_{idx:02d}.mp4'
    command('ffmpeg','-hide_banner','-loglevel','error','-y','-loop','1','-framerate','15',
            '-i',str(png),'-t',f'{seconds:.2f}','-vf','format=yuv420p',
            '-c:v','libx264','-preset','ultrafast','-crf','28','-r','15',str(mp4))
playlist=WORK/'scenes.txt'
playlist.write_text(''.join("file '"+str(WORK/f'slide_{idx:02d}.mp4')+"'\n" for idx in range(len(scenes))))
video=WORK/'silent.mp4'
command('ffmpeg','-hide_banner','-loglevel','error','-y','-f','concat','-safe','0','-i',str(playlist),'-c','copy',str(video))
final=OUT/'agent-outlet-training.mp4'
command('ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(video),'-i',str(AUDIO),
        '-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','aac','-b:a','144k',
        '-af','loudnorm=I=-17:TP=-1.5:LRA=9','-movflags','+faststart','-shortest',str(final))
print('Created',final,'size',final.stat().st_size,'audio_duration',DUR)
