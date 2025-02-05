# Core Energy System Design

## Overview

A performant, event-driven energy system for plant simulation that combines event-based state changes with efficient bitwise random light absorption.

## Core Energy Requirements

- Each cell requires ~1 energy per 60 frames to survive
- Cells absorb energy through light collection
- Target ~2% chance (1/50) per frame to absorb 1 unit of energy
- Energy state affects growth, survival, and reproduction

## Cell States

- THRIVING: More than enough energy, can grow/reproduce
- HEALTHY: Maintaining energy balance
- STRESSED: Not enough energy, starting to suffer
- DYING: Critical energy shortage

## State Transitions

- States change based on:
  - Current energy level
  - Number of open sides for light collection
  - Connection to energy-providing neighbors
  - Time spent in current state

## Energy Flow

- Energy collected by exposed cells
- Can be stored in seed/core cells
- Flows through connected structure
- Cells need minimum energy to maintain position
- Excess energy enables growth/reproduction

## Performance Optimizations

- Only check cells when state might change
- Batch process multiple frames when checking
- Use efficient bitwise operations for randomization
- Limit propagation of state changes

## Key Metrics

- Target performance: handle 1000+ cells at 60fps
- Energy balance tuned for stable but dynamic growth
- Natural-feeling randomness in light absorption
- Reproducible results with seed system
