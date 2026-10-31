"""Multi-Organization Hackathons & Problem Statements Seed Script.
Seeds 3 distinct hackathons hosted by different organizations with rich metadata:
- Sponsors, prize breakdown, schedule, eligibility, and perks
1. IIT Guwahati National HackSprint 2026 (In-Person / Live Now)
2. Apollo 24: Deep Space Orbital Hackathon (Apollo Aerospace Labs / Starts in ~3 Hours)
3. Global Web3 & Distributed Cloud Summit (Ethereum Foundation / Upcoming Tomorrow)
"""
import sys
import os
import datetime

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy.orm import Session
from sqlalchemy import select
from backend.app.db import SessionLocal
from backend.app.models.entities import Event, User, ProblemStatement, Organization, utcnow
from backend.app.services.event_service import EventService
from backend.app.services.auth_service import AuthService
from backend.app.schemas.schemas import EventCreate

def seed_multi_org():
    db: Session = SessionLocal()
    print("🌱 Seeding Multi-Organization Hackathons with Rich Apple Dossiers...")

    # Ensure admin user exists
    admin_user = AuthService.register_or_get_user(
        db, email="admin@hackos.io", password="Password123!", is_super_admin=True
    )

    now = utcnow()

    # Seed Organizations
    def get_or_create_org(name, slug, category, website, desc):
        org = db.query(Organization).filter_by(slug=slug).first()
        if not org:
            org = Organization(
                name=name,
                slug=slug,
                category=category,
                website=website,
                description=desc,
                contact_email=f"contact@{slug}.org",
                is_verified=True,
                owner_id=admin_user.id
            )
            db.add(org)
            db.commit()
            db.refresh(org)
        return org

    org1 = get_or_create_org(
        name="IIT Guwahati Tech Council",
        slug="iitg-tech-council",
        category="university",
        website="https://iitg.ac.in",
        desc="Apex student technical council of Indian Institute of Technology Guwahati organizing nationwide innovation sprints."
    )
    org2 = get_or_create_org(
        name="Apollo Aerospace Labs & NASA JPL",
        slug="apollo-aerospace",
        category="aerospace",
        website="https://apollo.hackos.io",
        desc="Deep space mission consortium advancing autonomous flight systems, satellite constellations, and interplanetary telemetry."
    )
    org3 = get_or_create_org(
        name="Ethereum Foundation & Global Dev League",
        slug="ethereum-foundation",
        category="foundation",
        website="https://ethereum.org",
        desc="Global decentralized developer federation advancing zero-knowledge cryptography, Layer 2 scaling, and open compute."
    )

    # 1. IIT Guwahati National HackSprint 2026 (Live Now)
    slug1 = "iitg-hacksprint-2026"
    ev1 = db.query(Event).filter_by(slug=slug1).first()
    if ev1:
        db.delete(ev1)
        db.commit()

    ev1_payload = EventCreate(
        slug=slug1,
        title="IIT Guwahati National HackSprint 2026",
        description="India's premier university hackathon bringing together 1,000+ top engineering minds to solve national-scale challenges in disaster resilience, smart campus grids, and distributed healthcare.",
        format_type="offline_24h",
        starts_at=now - datetime.timedelta(hours=2),
        ends_at=now + datetime.timedelta(hours=22),
        submission_deadline=now + datetime.timedelta(hours=20),
        grace_period_minutes=30
    )
    ev1 = EventService.create_event(db, ev1_payload, actor_id=admin_user.id)
    ev1.organization_id = org1.id
    ev1.status = "ongoing"
    ev1.format_config = {
        "organization": "IIT Guwahati Tech Council",
        "organization_role": "Academic & Research Host",
        "organization_badge": "Premier Institute",
        "prize_pool": "₹5,00,000 INR",
        "venue_type": "In-Person (Guwahati, Assam)",
        "mode": "In-Person Campus Hackathon",
        "address": "Technology Complex, IIT Guwahati, Amingaon, North Guwahati, Assam 781039",
        "tags": ["AI/ML", "IoT", "CleanTech", "Social Good"],
        "hero_badge": "LIVE HACKATHON",
        "sponsors": [
            {"name": "Google Cloud", "tier": "Title Cloud Partner", "perk": "$500 Vertex AI Credits per squad"},
            {"name": "NVIDIA", "tier": "Compute Sponsor", "perk": "Dedicated RTX 6000 Ada GPU Instances"},
            {"name": "Intel AI", "tier": "Hardware Acceleration", "perk": "OpenVINO Developer Toolkits"},
            {"name": "GitHub Education", "tier": "Developer Platform", "perk": "GitHub Enterprise & Copilot Access"},
            {"name": "Postman", "tier": "API Innovation", "perk": "Postman Enterprise Workspaces & Swag"}
        ],
        "prize_breakdown": [
            {"place": "1st Place (Grand Champion)", "amount": "₹2,50,000", "perk": "IIT Guwahati Technology Incubation Fast-Track + Seed Grant"},
            {"place": "2nd Place (Runner-Up)", "amount": "₹1,50,000", "perk": "Direct Angel Pitch Day + Cloud Compute Vouchers"},
            {"place": "3rd Place (Impact Award)", "amount": "₹1,00,000", "perk": "Hardware Prototyping Stipend + Mentorship"}
        ],
        "eligibility": "Open to all enrolled undergraduate, postgraduate, and PhD engineering students worldwide. Squad size: 1 to 4 hackers.",
        "schedule": [
            {"time": "08:00 AM", "label": "Security Clearance & Physical Check-in at Technology Complex"},
            {"time": "10:00 AM", "label": "Grand Opening Ceremony & Keynote by Tech Council Dean"},
            {"time": "11:00 AM", "label": "Problem Statements Reveal & Squad Track Lock"},
            {"time": "04:00 PM", "label": "Architecture Review Round 1 with Research Faculty"},
            {"time": "07:00 AM (Next Day)", "label": "Project Submission Freeze & Cryptographic Receipt Generation"},
            {"time": "09:30 AM (Next Day)", "label": "Live Demo Pitch to Jury & Prize Distribution"}
        ],
        "perks": [
            "24/7 Air-Conditioned High-Speed Fiber Lab Facilities",
            "Continuous Gourmet Catering, Energy Drinks, and Espresso Bar",
            "Hardware Lab Access with Oscilloscopes, ESP32, and Raspberry Pi kits",
            "Verifiable Digital Identity Credential on Sovereign Ledger"
        ]
    }
    db.commit()

    ps1_1 = ProblemStatement(
        event_id=ev1.id,
        title="Brahmaputra AI Flood Warning & Hydrological Alert Grid",
        track="AI for Social Good",
        description="Design a real-time hydrological simulation and early-warning alert system for the Brahmaputra River basin. The system must ingest live gauge telemetry, rainfall radar data, and topographical elevation models to predict flash flooding 6 hours ahead of cresting, and broadcast offline USSD/SMS alerts to vulnerable rural river-island (char) communities.",
        requirements=[
            "Ingest continuous river level streams (JSON / MQTT) and display geospatial risk map",
            "Predict water level inflection points with mean squared error under 0.08m",
            "Offline broadcast queue simulation with automated multi-lingual SMS/USSD alert generation",
            "Interactive low-bandwidth mobile dashboard for district disaster authorities"
        ],
        rules="Open-source pre-trained geospatial and hydrologic models are allowed. Must include synthetic telemetry generator for stress-testing.",
        reveal_at=ev1.starts_at,
        is_revealed=True
    )
    ps1_2 = ProblemStatement(
        event_id=ev1.id,
        title="Campus Edge-AI Microgrid & Thermal Optimization",
        track="IoT & Sustainable Tech",
        description="Develop an autonomous edge-controller algorithm that optimizes building HVAC, laboratory chiller plants, and solar battery storage across the 700-acre IIT Guwahati campus. The system must shave peak load charges during hot humid hours while guaranteeing zero brownout risk for cryogenic research labs.",
        requirements=[
            "Multi-agent Reinforcement Learning or MPC algorithm for battery discharge scheduling",
            "Dynamic electricity tariff arbitrage based on time-of-day demand pricing",
            "Fail-safe bypass mechanism ensuring laboratory critical circuits never drop power",
            "Live WebGL dashboard visualizing real-time campus energy flow and carbon savings"
        ],
        rules="Solutions must achieve at least 15% demonstrated peak demand reduction against the provided campus benchmark baseline.",
        reveal_at=ev1.starts_at,
        is_revealed=True
    )
    ps1_3 = ProblemStatement(
        event_id=ev1.id,
        title="Decentralized Cold-Chain Vaccine & Anti-Venom Verification",
        track="Web3 & Logistics",
        description="Build a tamper-evident decentralized logistics tracking network for life-saving anti-venom and refrigerated pharmaceuticals shipped to remote primary health centres in Northeast India. Incorporate NFC/QR cryptographic handoffs and zero-gas state rollups.",
        requirements=[
            "Cryptographic proof of temperature thresholds logged via edge sensors",
            "Digital handoff custody signatures between transit couriers and district clinics",
            "Instant revocation of spoiled batches with automated re-route dispatch orders",
            "PWA mobile scanner capable of operating completely offline in zero-connectivity terrain"
        ],
        rules="Smart contracts must deploy to any EVM testnet or run an in-browser deterministic mock ledger.",
        reveal_at=ev1.starts_at,
        is_revealed=True
    )
    db.add_all([ps1_1, ps1_2, ps1_3])
    db.commit()

    # 2. Apollo 24: Deep Space Orbital Hackathon (Starts in ~3 Hours)
    slug2 = "apollo-24"
    ev2 = db.query(Event).filter_by(slug=slug2).first()
    if ev2:
        db.delete(ev2)
        db.commit()

    ev2_payload = EventCreate(
        slug=slug2,
        title="APOLLO 24: Deep Space Orbital Hackathon",
        description="High-velocity 24-hour mission building autonomous telemetry, neural space-probes, and fault-tolerant space systems for deep interplanetary missions.",
        format_type="offline_24h",
        starts_at=now + datetime.timedelta(hours=3, minutes=15),
        ends_at=now + datetime.timedelta(hours=27, minutes=15),
        submission_deadline=now + datetime.timedelta(hours=24, minutes=15),
        grace_period_minutes=20
    )
    ev2 = EventService.create_event(db, ev2_payload, actor_id=admin_user.id)
    ev2.organization_id = org2.id
    ev2.status = "published"
    ev2.format_config = {
        "organization": "Apollo Aerospace Labs & NASA JPL",
        "organization_role": "DeepTech & Space Mission Federation",
        "organization_badge": "Aerospace Partner",
        "prize_pool": "$50,000 USD",
        "venue_type": "Hybrid (San Francisco & Global Virtual)",
        "mode": "Hybrid (In-Person Hangar + Virtual Matrix)",
        "address": "Pier 70 Space Technology Hangar, San Francisco, CA & Global Discord Matrix",
        "tags": ["Aerospace", "DeepTech", "Autonomous Systems", "Rust"],
        "hero_badge": "STARTS IN 3 HOURS",
        "sponsors": [
            {"name": "NASA JPL Open Source", "tier": "Mission Partner", "perk": "NASA Deep Space Network Open Telemetry API"},
            {"name": "SpaceX Starlink", "tier": "Communications Partner", "perk": "High-throughput satellite test links"},
            {"name": "AWS Aerospace", "tier": "Ground Station Sponsor", "perk": "AWS Ground Station & Bedrock AI credits"},
            {"name": "Rust Foundation", "tier": "Systems Language Partner", "perk": "Embedded Rust hardware grants"}
        ],
        "prize_breakdown": [
            {"place": "1st Place (Orbital Champion)", "amount": "$25,000 USD", "perk": "Flight software tested on orbital CubeSat mission"},
            {"place": "2nd Place (Telemetry Innovation)", "amount": "$15,000 USD", "perk": "NASA JPL Tech Transfer mentorship"},
            {"place": "3rd Place (Fault Tolerance)", "amount": "$10,000 USD", "perk": "Direct interview with SpaceX flight software team"}
        ],
        "eligibility": "Open to global software engineers, aerospace students, robotics enthusiasts, and systems researchers. Solo or teams of up to 4.",
        "schedule": [
            {"time": "T - 3 Hours", "label": "Live Countdown & Space Hangar Doors Open"},
            {"time": "T - 0:00:00", "label": "Orbital Ignition & Problem Statements Unsealed"},
            {"time": "T + 4 Hours", "label": "Squad Telemetry & Track Selection Final Lock"},
            {"time": "T + 12 Hours", "label": "Mid-Flight Deep Space Flight Director Review"},
            {"time": "T + 24 Hours", "label": "Hard Telemetry Freeze & SHA-256 Receipt Seal"},
            {"time": "T + 26 Hours", "label": "Orbital Review & Award Broadcast"}
        ],
        "perks": [
            "Access to simulated Low Earth Orbit & Martian Telemetry datasets",
            "Dedicated flight software mentors from NASA JPL and aerospace startups",
            "Full food and coffee bar at SF Hangar + remote hacker kits mailed worldwide",
            "Exclusive Apollo 24 Mission Patch NFT and physical aerospace badge"
        ]
    }
    db.commit()

    ps2_1 = ProblemStatement(
        event_id=ev2.id,
        title="Orbital Telemetry Neural Anomaly Detection",
        track="Space Systems",
        description="High-throughput streaming sensor anomaly detection running on low-power radiation-hardened CubeSat compute modules. Detect solar flare radiation spikes and reaction wheel friction drift.",
        requirements=[
            "Sub-10ms inference per telemetry frame",
            "Radiation bit-flip resilience algorithm",
            "Zero false negative trigger rate for thermal runaway alerts"
        ],
        rules="Open NASA telemetry datasets provided upon kickoff.",
        reveal_at=ev2.starts_at,
        is_revealed=False
    )
    ps2_2 = ProblemStatement(
        event_id=ev2.id,
        title="LEO Constellation Inter-Satellite Optical Mesh Protocol",
        track="Networks & Distributed Systems",
        description="Dynamic routing protocol for a constellation of 60 low-earth orbit satellites communicating via line-of-sight laser links. Handle orbital node occlusions and relativistic clock drifts.",
        requirements=[
            "Dynamic routing matrix recalculation under 50ms",
            "Packet retransmission buffer minimizing ground station latency",
            "Fault simulation harness displaying constellation topology in 3D"
        ],
        rules="Must run in simulated asynchronous network environment.",
        reveal_at=ev2.starts_at,
        is_revealed=False
    )
    ps2_3 = ProblemStatement(
        event_id=ev2.id,
        title="Zero-G Cryogenic Fuel Gauge Computer Vision",
        track="Robotics & Vision",
        description="Estimate remaining propellant volume inside zero-gravity liquid oxygen tanks using internal stereo camera feeds observing fluid meniscus and gas bubbling dynamics.",
        requirements=[
            "Fluid surface boundary tracking under variable g-jitter",
            "Real-time volume calculation within 2% margin of error",
            "Lightweight edge neural pipeline running without internet uplink"
        ],
        rules="Synthetic zero-gravity fluid test videos provided upon reveal.",
        reveal_at=ev2.starts_at,
        is_revealed=False
    )
    db.add_all([ps2_1, ps2_2, ps2_3])
    db.commit()

    # 3. Global Web3 & Distributed Cloud Summit (Starts Tomorrow)
    slug3 = "eth-cloud-2026"
    ev3 = db.query(Event).filter_by(slug=slug3).first()
    if ev3:
        db.delete(ev3)
        db.commit()

    ev3_payload = EventCreate(
        slug=slug3,
        title="Global Web3 & Distributed Cloud Summit",
        description="Building decentralized infrastructure, zero-knowledge verifiable compute, and high-performance serverless rollups for the next billion users.",
        format_type="online_48h",
        starts_at=now + datetime.timedelta(days=1, hours=8),
        ends_at=now + datetime.timedelta(days=3, hours=8),
        submission_deadline=now + datetime.timedelta(days=2, hours=20),
        grace_period_minutes=45
    )
    ev3 = EventService.create_event(db, ev3_payload, actor_id=admin_user.id)
    ev3.organization_id = org3.id
    ev3.status = "published"
    ev3.format_config = {
        "organization": "Ethereum Foundation & Global Dev League",
        "organization_role": "Decentralized Foundation & Protocol Alliance",
        "organization_badge": "Global DAO",
        "prize_pool": "$100,000 USDC",
        "venue_type": "Virtual / Global",
        "mode": "100% Virtual Distributed Summit",
        "address": "Decentralized Livestream & Global Discord / Telegram Hacker Hubs",
        "tags": ["Web3", "ZK-SNARKs", "Decentralized Cloud", "Solidity"],
        "hero_badge": "UPCOMING",
        "sponsors": [
            {"name": "Ethereum Foundation", "tier": "Ecosystem Sovereign", "perk": "ZK-Grant Program Fast-Track"},
            {"name": "Arbitrum Foundation", "tier": "L2 Infrastructure", "perk": "$30,000 Track Bounty for Stylus smart contracts"},
            {"name": "Protocol Labs", "tier": "Storage & Compute", "perk": "Filecoin & IPFS decentralized storage bounties"},
            {"name": "Chainlink", "tier": "Oracle Partner", "perk": "Chainlink CCIP cross-chain interoperability bounty"}
        ],
        "prize_breakdown": [
            {"place": "1st Place (Grand Sovereign)", "amount": "$40,000 USDC", "perk": "Direct grant consideration with Ethereum Foundation Next Gen"},
            {"place": "2nd Place (Infrastructure Award)", "amount": "$30,000 USDC", "perk": "Arbitrum Stylus accelerator seed funding"},
            {"place": "3rd Place (Privacy & ZK Award)", "amount": "$20,000 USDC", "perk": "Security audit voucher with top crypto firm"},
            {"place": "Track Pool Bounties", "amount": "$10,000 USDC", "perk": "Shared across specialized track challenges"}
        ],
        "eligibility": "Global developers, cryptographers, distributed systems architects, and students of all experience levels.",
        "schedule": [
            {"time": "Day 1 - 09:00 UTC", "label": "Keynote on Zero-Knowledge Proofs & Protocol Scaling"},
            {"time": "Day 1 - 10:00 UTC", "label": "Official Problem Statement Unsealing & Hackathon Kickoff"},
            {"time": "Day 2 - 14:00 UTC", "label": "Office Hours with Ethereum Core Researchers"},
            {"time": "Day 3 - 06:00 UTC", "label": "Submission Deadline & On-Chain Audit Lock"},
            {"time": "Day 3 - 12:00 UTC", "label": "Final Demo Day Broadcast & USDC Distribution"}
        ],
        "perks": [
            "100% On-Chain Escrow Payouts directly in USDC upon jury confirmation",
            "Zero gas testnet faucets provided for all registered participants",
            "Exclusive NFT POAP badge minted on Arbitrum One",
            "Direct introductions to crypto venture funds looking to seed hackathon winners"
        ]
    }
    db.commit()

    ps3_1 = ProblemStatement(
        event_id=ev3.id,
        title="Zero-Knowledge Sovereign Identity & Proof of Unique Humanity",
        track="Cryptography & Privacy",
        description="Build a privacy-preserving identity verification protocol that proves human uniqueness without disclosing biometric keys or government ID records.",
        requirements=[
            "ZK-SNARK circuit for anonymous membership verification",
            "Sybil-resistant score aggregation across decentralized networks",
            "One-click browser extension / mobile sign-in bridge"
        ],
        rules="Circom or Halo2 proof systems recommended.",
        reveal_at=ev3.starts_at,
        is_revealed=False
    )
    ps3_2 = ProblemStatement(
        event_id=ev3.id,
        title="Decentralized Serverless GPU Orchestrator for Open Models",
        track="Cloud & Compute",
        description="Construct a peer-to-peer compute marketplace matching consumer and data center GPUs to execute open-source LLM inference workloads with verifiable execution proofs.",
        requirements=[
            "Automated node benchmarking and latency clustering",
            "Proof-of-computation verification layer catching hallucinated outputs",
            "Smart contract escrow paying compute providers per token generated"
        ],
        rules="Must support standard OpenAI API interface compatibility.",
        reveal_at=ev3.starts_at,
        is_revealed=False
    )
    db.add_all([ps3_1, ps3_2])
    db.commit()

    db.close()
    print("✨ Multi-Organization Hackathons seeded with rich Apple metadata successfully!")

if __name__ == "__main__":
    seed_multi_org()
