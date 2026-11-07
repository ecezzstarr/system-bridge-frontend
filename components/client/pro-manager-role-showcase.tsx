import Link from 'next/link'
import {
 ArrowUpRight,BriefcaseBusiness,Building2,ChartNoAxesCombined,
 ClipboardList,Layers3,Store,UsersRound
} from 'lucide-react'
import styles from './pro-manager-role-showcase.module.css'

const features=[
 {
  icon:Building2,
  name:'Private Pro business world',
  description:'A Pro-tier File Folder built around your approved work in life—not a predetermined industry or a generic manager workspace.',
  tag:'YOUR BUSINESS',
 },
 {
  icon:Store,
  name:'Customer Door',
  description:'Present your products or services and guide customers into your business through the File Folder’s customer-facing systems.',
  tag:'CUSTOMER ACCESS',
 },
 {
  icon:Layers3,
  name:'Workshops, systems & tools',
  description:'Build and operate the workspaces, business modules and practical systems your enterprise needs to function.',
  tag:'DAILY OPERATIONS',
 },
 {
  icon:UsersRound,
  name:'Employees & participation',
  description:'Coordinate authorized employees and company participation around clear responsibilities and recorded business work.',
  tag:'YOUR TEAM',
 },
 {
  icon:ClipboardList,
  name:'Orders & company records',
  description:'Keep business activity, customer requests, fulfillment and responsible operating records connected to actual work.',
  tag:'ACCOUNTABILITY',
 },
 {
  icon:ChartNoAxesCombined,
  name:'Regional growth',
  description:'Develop your approved territory by serving people, strengthening partnerships and expanding what your enterprise can deliver.',
  tag:'EXPANSION',
 },
] as const

type Props={actionHref:string;actionText:string}

export default function ProManagerRoleShowcase({actionHref,actionText}:Props){
 return <div className={styles.root} data-pro-manager-showcase="true">
  <section className={styles.hero} aria-labelledby="pro-manager-role-title">
   <div className={styles.heroCopy}>
    <p className={styles.eyebrow}>WEAVE OF PRESENCE <span aria-hidden="true">/</span> THE COMPANY OF TIME</p>
    <div className={styles.rolePill}>Company position <span>·</span> Pro File Folder</div>
    <h1 id="pro-manager-role-title">Pro Regional <span>Manager</span></h1>
    <p className={styles.lead}>Operate a business shaped by your work in life, inside your own Pro File Folder.</p>
    <p className={styles.description}>Weave gives your enterprise a structured world for its systems, customers, employees and growth. As you serve people and create verified value, your business develops—and Weave grows through that success.</p>
    <div className={styles.actions}>
     <Link href={actionHref} className={styles.primary}>{actionText}<ArrowUpRight size={18} aria-hidden="true"/></Link>
     <a href="#pro-manager-systems" className={styles.secondary}>Explore Pro systems</a>
    </div>
    <p className={styles.qualification}>A company appointment and salary are approved separately. A Pro File Folder does not guarantee earnings or provide automatic access to another business.</p>
   </div>
   <div className={styles.visual} aria-label="Illustration of a radiant blue Pro File Folder and its business systems" role="img">
    <div className={styles.orbitOne}/>
    <div className={styles.orbitTwo}/>
    <div className={styles.stationTop}><Layers3 size={15} aria-hidden="true"/><span>SYSTEMS</span></div>
    <div className={styles.folder}>
     <div className={styles.folderTab}>WEAVE <span>PRO</span></div>
     <div className={styles.folderFront}>
      <span className={styles.folderSymbol}>W</span>
      <span className={styles.folderText}>YOUR BUSINESS WORLD</span>
      <div className={styles.folderDivider}/>
      <span className={styles.folderTag}>PRIVATE FILE FOLDER</span>
     </div>
    </div>
    <div className={styles.stationLeft}><UsersRound size={15} aria-hidden="true"/><span>PEOPLE</span></div>
    <div className={styles.stationRight}><Store size={15} aria-hidden="true"/><span>CUSTOMER DOOR</span></div>
    <p className={styles.visualFootnote}>Pro-tier operating environment · illustrative view</p>
   </div>
  </section>
  <section id="pro-manager-systems" className={styles.systems} aria-labelledby="pro-manager-systems-title">
   <header className={styles.sectionHead}>
    <div>
     <p className={styles.sectionKicker}>THE PRO FILE FOLDER</p>
     <h2 id="pro-manager-systems-title">Your business. Working systems.</h2>
    </div>
    <p>Every Pro Manager receives the Pro standard. Your approved business plan determines the specific work and systems built inside it.</p>
   </header>
   <div className={styles.featureGrid}>
    {features.map(({icon:Icon,name,description,tag})=><article className={styles.feature} key={name}>
     <div className={styles.featureTop}><span className={styles.iconBox}><Icon size={23} strokeWidth={1.7} aria-hidden="true"/></span><span className={styles.featureTag}>{tag}</span></div>
     <h3>{name}</h3><p>{description}</p>
    </article>)}
   </div>
  </section>
  <section className={styles.outcome} aria-labelledby="pro-manager-relationship-title">
   <span className={styles.outcomeIcon}><BriefcaseBusiness size={24} aria-hidden="true"/></span>
   <div>
    <p className={styles.sectionKicker}>ONE COMPANY · MANY ENTERPRISES</p>
    <h2 id="pro-manager-relationship-title">Your progress strengthens the company.</h2>
    <p>The Pro File Folder organizes your work. Your employees and systems help deliver it. Your customers and verified records show the value created. That sustained participation is how your business—and Weave—can grow together.</p>
   </div>
   <div className={styles.flow} aria-label="Business growth sequence">
    <span>YOUR WORK</span><i aria-hidden="true">→</i><span>PRO FOLDER</span><i aria-hidden="true">→</i><span>REAL VALUE</span><i aria-hidden="true">→</i><span>COMPANY GROWTH</span>
   </div>
  </section>
 </div>
}
