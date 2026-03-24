/**
 * generateTestResumes.cjs
 * Creates 5 realistic PDF resumes for research paper testing
 */

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, '..', 'test-resumes');
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const candidates = [
  {
    name: 'Arjun Sharma',
    email: 'arjun.sharma.test01@gmail.com',
    phone: '+91 9876543210',
    location: 'Bangalore, India',
    experience: '4 years',
    summary: 'Full-stack developer with 4 years of experience building scalable web applications using React, Node.js, and MongoDB. Strong backend skills with REST API design and microservices architecture.',
    skills: ['JavaScript', 'React', 'Node.js', 'Express', 'MongoDB', 'REST APIs', 'Git', 'HTML', 'CSS', 'Redux'],
    experience_items: [
      { role: 'Senior Software Engineer', company: 'TechCorp India', duration: '2022–Present', desc: 'Led backend development using Node.js and Express. Designed REST APIs serving 50k+ daily users. Implemented MongoDB aggregation pipelines for analytics.' },
      { role: 'Software Developer', company: 'StartupHub', duration: '2020–2022', desc: 'Built React dashboards and integrated third-party APIs. Reduced page load time by 40% through code splitting and lazy loading.' }
    ],
    education: 'B.Tech Computer Science — VIT University, 2020 — CGPA 8.7',
    projects: [
      'E-Commerce Platform: Built with MERN stack, handling 10k concurrent users',
      'Task Management App: Real-time updates with Socket.io and Redis caching',
      'API Gateway: Node.js service handling authentication and rate limiting'
    ]
  },
  {
    name: 'Priya Nair',
    email: 'priya.nair.test02@gmail.com',
    phone: '+91 9123456789',
    location: 'Hyderabad, India',
    experience: '2 years',
    summary: 'Frontend developer specializing in React and TypeScript. Experience building responsive, accessible web interfaces. Familiar with Agile development and UI/UX best practices.',
    skills: ['React', 'TypeScript', 'HTML', 'CSS', 'JavaScript', 'Figma', 'Jest', 'Git'],
    experience_items: [
      { role: 'Frontend Developer', company: 'DesignFirst Solutions', duration: '2022–Present', desc: 'Built reusable component libraries in React + TypeScript. Improved Lighthouse accessibility score from 62 to 94. Collaborated with UX team using Figma.' }
    ],
    education: 'B.Sc Computer Science — Osmania University, 2022 — CGPA 8.2',
    projects: [
      'Portfolio Builder: Drag-and-drop portfolio website builder using React DnD',
      'Weather Dashboard: Real-time weather visualization with Chart.js'
    ]
  },
  {
    name: 'Rahul Verma',
    email: 'rahul.verma.test03@gmail.com',
    phone: '+91 9988776655',
    location: 'Pune, India',
    experience: '6 years',
    summary: 'DevOps and backend engineer with 6 years of experience in cloud infrastructure, CI/CD pipelines, and containerization. Expert in AWS, Docker, Kubernetes, and Python automation.',
    skills: ['Python', 'Docker', 'Kubernetes', 'AWS', 'CI/CD', 'Jenkins', 'Linux', 'Bash', 'Terraform', 'Node.js', 'MongoDB'],
    experience_items: [
      { role: 'DevOps Lead', company: 'CloudNative Systems', duration: '2021–Present', desc: 'Managed Kubernetes clusters on AWS EKS with 99.9% uptime. Built CI/CD pipelines using Jenkins and GitHub Actions. Reduced deployment time by 65%.' },
      { role: 'Backend Engineer', company: 'DataStream Inc', duration: '2018–2021', desc: 'Developed Python microservices handling real-time data pipelines. Managed AWS Lambda functions processing 1M+ events daily.' }
    ],
    education: 'B.E. Information Technology — Pune University, 2018 — First Class Distinction',
    projects: [
      'Auto-scaling K8s Cluster: AWS EKS with Horizontal Pod Autoscaler',
      'Multi-cloud Terraform Modules: Reusable IaC for AWS and GCP deployments',
      'Log Aggregation Service: ELK stack setup for distributed logging'
    ]
  },
  {
    name: 'Sneha Pillai',
    email: 'sneha.pillai.test04@gmail.com',
    phone: '+91 9870123456',
    location: 'Chennai, India',
    experience: '1 year',
    summary: 'Recent graduate with 1 year of internship experience in data science and machine learning. Proficient in Python, Pandas, and scikit-learn. Eager to apply ML skills in a production environment.',
    skills: ['Python', 'Machine Learning', 'Pandas', 'NumPy', 'scikit-learn', 'SQL', 'Jupyter', 'Git'],
    experience_items: [
      { role: 'Data Science Intern', company: 'Analytics Nexus', duration: '2023–2024', desc: 'Built classification models using scikit-learn achieving 87% accuracy. Performed EDA on large datasets using Pandas and visualized insights with Matplotlib.' }
    ],
    education: 'B.Sc Data Science — Anna University, 2023 — CGPA 8.9',
    projects: [
      'Customer Churn Prediction: Logistic regression model with 87% accuracy',
      'Sentiment Analysis: NLP pipeline using NLTK on Twitter dataset'
    ]
  },
  {
    name: 'Kiran Mehta',
    email: 'kiran.mehta.test05@gmail.com',
    phone: '+91 9012345678',
    location: 'Mumbai, India',
    experience: '3 years',
    summary: 'Backend Java developer with 3 years of experience in Spring Boot microservices and SQL databases. Strong understanding of system design, RESTful services, and performance optimization.',
    skills: ['Java', 'Spring Boot', 'SQL', 'MySQL', 'REST APIs', 'Maven', 'Git', 'Agile', 'Microservices'],
    experience_items: [
      { role: 'Java Backend Developer', company: 'FinServe Technologies', duration: '2021–Present', desc: 'Developed Spring Boot microservices for a banking platform serving 2M users. Optimized SQL queries reducing response time from 800ms to 120ms.' },
      { role: 'Junior Developer', company: 'CodeBase Solutions', duration: '2020–2021', desc: 'Built RESTful APIs using Spring MVC. Wrote unit tests using JUnit achieving 85% code coverage.' }
    ],
    education: 'B.Tech Information Technology — VJTI Mumbai, 2021 — CGPA 7.8',
    projects: [
      'Payment Gateway Integration: Spring Boot service integrating Razorpay and Stripe',
      'Inventory Management System: Full CRUD with Spring Data JPA and MySQL'
    ]
  }
];

function createResumePDF(candidate, filename) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const stream = fs.createWriteStream(filename);
    doc.pipe(stream);

    // Header
    doc.fontSize(22).font('Helvetica-Bold').text(candidate.name, { align: 'center' });
    doc.fontSize(10).font('Helvetica').fillColor('#555555')
       .text(`${candidate.email}  |  ${candidate.phone}  |  ${candidate.location}`, { align: 'center' });
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#cccccc');
    doc.moveDown(0.5);

    // Summary
    doc.fontSize(13).font('Helvetica-Bold').fillColor('#1a1a2e').text('Professional Summary');
    doc.moveDown(0.2);
    doc.fontSize(10).font('Helvetica').fillColor('#333333').text(candidate.summary);
    doc.moveDown(0.8);

    // Skills
    doc.fontSize(13).font('Helvetica-Bold').fillColor('#1a1a2e').text('Technical Skills');
    doc.moveDown(0.2);
    doc.fontSize(10).font('Helvetica').fillColor('#333333')
       .text(candidate.skills.join('  •  '), { lineGap: 3 });
    doc.moveDown(0.8);

    // Experience
    doc.fontSize(13).font('Helvetica-Bold').fillColor('#1a1a2e').text('Professional Experience');
    doc.moveDown(0.2);
    for (const exp of candidate.experience_items) {
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#333333').text(exp.role, { continued: true });
      doc.fontSize(10).font('Helvetica').fillColor('#777777').text(`  —  ${exp.company}  (${exp.duration})`);
      doc.fontSize(10).font('Helvetica').fillColor('#444444').text(exp.desc, { indent: 10, lineGap: 2 });
      doc.moveDown(0.5);
    }
    doc.moveDown(0.3);

    // Education
    doc.fontSize(13).font('Helvetica-Bold').fillColor('#1a1a2e').text('Education');
    doc.moveDown(0.2);
    doc.fontSize(10).font('Helvetica').fillColor('#333333').text(candidate.education);
    doc.moveDown(0.8);

    // Projects
    doc.fontSize(13).font('Helvetica-Bold').fillColor('#1a1a2e').text('Projects');
    doc.moveDown(0.2);
    for (const proj of candidate.projects) {
      const [title, ...desc] = proj.split(':');
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#333333').text(`• ${title}:`, { continued: true });
      doc.font('Helvetica').fillColor('#444444').text(desc.join(':'), { lineGap: 2 });
    }

    doc.end();
    stream.on('finish', () => {
      console.log(`✅ Created: ${path.basename(filename)}`);
      resolve(filename);
    });
    stream.on('error', reject);
  });
}

async function main() {
  console.log('\n📄 Generating test resumes for RecruitPro research testing...\n');
  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i];
    const filename = path.join(OUTPUT_DIR, `resume_${String(i+1).padStart(2,'0')}_${c.name.replace(/\s+/g,'_')}.pdf`);
    await createResumePDF(c, filename);
  }
  console.log(`\n✅ All ${candidates.length} resumes saved to: ${OUTPUT_DIR}`);
  console.log('\nCandidate credentials:');
  candidates.forEach((c, i) => {
    console.log(`  ${i+1}. ${c.name.padEnd(18)} | email: ${c.email} | password: Test@1234`);
  });
}

main().catch(console.error);
