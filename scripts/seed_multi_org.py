"""Multi-Organization Hackathons & Problem Statements Seed Script.
Seeds 3 distinct hackathons hosted by different organizations:
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
from backend.app.models.entities import Event, User, ProblemStatement, utcnow
from backend.app.services.event_service import EventService
from backend.app.services.auth_service import AuthService
from backend.app.schemas.schemas import EventCreate

def seed_multi_org():
    db: Session = SessionLocal()
    print("🌱 Seeding Multi-Organization Hackathons and Problem Statements...")

    # Ensure admin user exists
    admin_user = AuthService.register_or_get_user(
        db, email="admin@hackos.io", password="Password123!", is_super_admin=True
    )

    # 1. IIT Guwahati National HackSprint 2026 (Live Now)
    slug1 = "iitg-hacksprint-2026"
    ev1 = db.query(Event).filter_by(slug=slug1).first()
    if ev1:
        db.delete(ev1)
        db.commit()

    now = utcnow()
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
    ev1.status = "ongoing"
    ev1.format_config = {
        "organization": "IIT Guwahati Tech Council",
        "prize_pool": "₹5,00,000 INR",
        "venue_type": "In-Person (Guwahati, Assam)",
        "mode": "In-Person",
        "tags": ["AI/ML", "IoT", "CleanTech", "Social Good"],
        "hero_badge": "LIVE HACKATHON"
    }
    db.commit()

    # Seed Problem Statements for IIT Guwahati
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
    print(f"✅ IIT Guwahati HackSprint seeded with 3 live Problem Statements (Event ID: {ev1.id})")

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
    ev2.status = "published"
    ev2.format_config = {
        "organization": "Apollo Aerospace Labs & NASA JPL",
        "prize_pool": "$50,000 USD",
        "venue_type": "Hybrid (San Francisco & Global Virtual)",
        "mode": "Hybrid",
        "tags": ["Aerospace", "DeepTech", "Autonomous Systems", "Rust"],
        "hero_badge": "STARTS IN 3 HOURS"
    }
    db.commit()

    # Seed Apollo Problem Statements (Sealed until starts_at!)
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
    print(f"✅ Apollo 24 seeded with 3 sealed Problem Statements (Event ID: {ev2.id})")

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
    ev3.status = "published"
    ev3.format_config = {
        "organization": "Ethereum Foundation & Global Dev League",
        "prize_pool": "$100,000 USDC",
        "venue_type": "Virtual / Global",
        "mode": "Virtual",
        "tags": ["Web3", "ZK-SNARKs", "Decentralized Cloud", "Solidity"],
        "hero_badge": "UPCOMING"
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
    print(f"✅ Web3 Summit seeded with 2 Problem Statements (Event ID: {ev3.id})")

    db.close()
    print("✨ Multi-Organization Hackathons and Problem Statements successfully seeded!")

if __name__ == "__main__":
    seed_multi_org()
