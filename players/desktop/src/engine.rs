//! Moteur narratif Herodio — portage Rust de editor/src/engine/engine.ts.
//! Mêmes règles, vérifiées par les tests de conformance de spec/conformance.

use serde::Deserialize;
use std::collections::{HashMap, HashSet};

pub const MAX_AUTO_STEPS: usize = 1000;

#[derive(Deserialize, Clone, Debug)]
#[serde(tag = "kind", rename_all = "lowercase")]
pub enum Test {
    Item { item: String },
    Var { var: String, op: String, value: i64 },
    Visited { node: String },
}

#[derive(Deserialize, Clone, Debug)]
pub struct Opt {
    #[serde(default)]
    pub text: String,
    #[serde(default)]
    pub audio: Option<String>,
    pub next: Option<String>,
}

#[derive(Deserialize, Clone, Debug)]
#[serde(tag = "type", rename_all = "lowercase")]
pub enum Node {
    Scene { id: String, #[serde(default)] title: String, #[serde(default)] text: String, #[serde(default)] audio: Option<String>, next: Option<String> },
    Choice { id: String, #[serde(default)] title: String, #[serde(default)] text: String, #[serde(default)] audio: Option<String>, options: Vec<Opt> },
    End { id: String, kind: String, #[serde(default)] title: String, #[serde(default)] text: String, #[serde(default)] audio: Option<String> },
    Item { id: String, op: String, item: String, next: Option<String> },
    Var { id: String, op: String, var: String, value: i64, next: Option<String> },
    Cond { id: String, test: Test, then: Option<String>, #[serde(rename = "else")] otherwise: Option<String> },
    Jump { id: String, target: Option<String>, reset: bool },
}

impl Node {
    pub fn id(&self) -> &str {
        match self {
            Node::Scene { id, .. } | Node::Choice { id, .. } | Node::End { id, .. } | Node::Item { id, .. }
            | Node::Var { id, .. } | Node::Cond { id, .. } | Node::Jump { id, .. } => id,
        }
    }
    pub fn audio(&self) -> Option<&str> {
        match self {
            Node::Scene { audio, .. } | Node::Choice { audio, .. } | Node::End { audio, .. } => audio.as_deref(),
            _ => None,
        }
    }
}

#[derive(Deserialize, Clone, Debug)]
pub struct Named { pub id: String, pub name: String }

#[allow(dead_code)]
#[derive(Deserialize, Clone, Debug)]
pub struct Variable { pub id: String, #[serde(default)] pub name: String, #[serde(default)] pub initial: i64 }

#[allow(dead_code)]
#[derive(Deserialize, Clone, Debug)]
pub struct Story {
    pub format: String,
    pub version: u32,
    pub id: String,
    pub title: String,
    #[serde(default)]
    pub author: String,
    #[serde(default)]
    pub description: String,
    pub start: Option<String>,
    #[serde(default)]
    pub items: Vec<Named>,
    #[serde(default)]
    pub variables: Vec<Variable>,
    pub nodes: Vec<Node>,
}

#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum Status { Playing, End, Error }

pub struct Engine {
    pub story: Story,
    index: HashMap<String, usize>,
    pub node: Option<usize>,
    pub status: Status,
    pub items: Vec<String>,
    pub vars: HashMap<String, i32>,
    visited: HashSet<String>,
}

impl Engine {
    pub fn new(story: Story) -> Self {
        let index = story.nodes.iter().enumerate().map(|(i, n)| (n.id().to_string(), i)).collect();
        Engine { story, index, node: None, status: Status::End, items: vec![], vars: HashMap::new(), visited: HashSet::new() }
    }

    fn reset(&mut self) {
        self.items.clear();
        self.vars = self.story.variables.iter().map(|v| (v.id.clone(), v.initial as i32)).collect();
        self.visited.clear();
    }

    pub fn start(&mut self) {
        self.reset();
        let s = self.story.start.clone();
        self.go(s);
    }

    pub fn current(&self) -> Option<&Node> {
        self.node.map(|i| &self.story.nodes[i])
    }

    pub fn next(&mut self) {
        if self.status != Status::Playing { return; }
        if let Some(Node::Scene { next, .. }) = self.current() {
            let n = next.clone();
            self.go(n);
        }
    }

    pub fn choose(&mut self, index: usize) {
        if self.status != Status::Playing { return; }
        if let Some(Node::Choice { options, .. }) = self.current() {
            if let Some(o) = options.get(index) {
                let n = o.next.clone();
                self.go(n);
            }
        }
    }

    pub fn token(&self) -> String {
        match (self.status, self.current()) {
            (Status::Error, _) => "#error".into(),
            (_, Some(n)) => n.id().into(),
            _ => "#end".into(),
        }
    }

    fn test(&self, t: &Test) -> bool {
        match t {
            Test::Item { item } => self.items.contains(item),
            Test::Visited { node } => self.visited.contains(node),
            Test::Var { var, op, value } => {
                let a = *self.vars.get(var).unwrap_or(&0);
                let b = *value as i32;
                match op.as_str() {
                    "==" => a == b, "!=" => a != b, "<" => a < b, "<=" => a <= b, ">" => a > b, ">=" => a >= b,
                    _ => false,
                }
            }
        }
    }

    fn go(&mut self, mut id: Option<String>) {
        for _ in 0..=MAX_AUTO_STEPS {
            let Some(i) = id.as_ref().and_then(|k| self.index.get(k)).copied() else {
                self.node = None;
                self.status = Status::End;
                return;
            };
            let n = self.story.nodes[i].clone();
            self.visited.insert(n.id().to_string());
            match n {
                Node::Scene { .. } | Node::Choice { .. } => { self.node = Some(i); self.status = Status::Playing; return; }
                Node::End { .. } => { self.node = Some(i); self.status = Status::End; return; }
                Node::Item { op, item, next, .. } => {
                    if op == "give" { if !self.items.contains(&item) { self.items.push(item); } }
                    else { self.items.retain(|x| *x != item); }
                    id = next;
                }
                Node::Var { op, var, value, next, .. } => {
                    let base = if op == "set" { 0 } else { *self.vars.get(&var).unwrap_or(&0) };
                    self.vars.insert(var, base.wrapping_add(value as i32));
                    id = next;
                }
                Node::Cond { test, then, otherwise, .. } => id = if self.test(&test) { then } else { otherwise },
                Node::Jump { target, reset, .. } => { if reset { self.reset(); } id = target; }
            }
        }
        self.node = None;
        self.status = Status::Error;
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::Value;

    #[test]
    fn conformance() {
        let dir = concat!(env!("CARGO_MANIFEST_DIR"), "/../../spec/conformance");
        let mut count = 0;
        for f in std::fs::read_dir(dir).unwrap() {
            let path = f.unwrap().path();
            let c: Value = serde_json::from_str(&std::fs::read_to_string(&path).unwrap()).unwrap();
            let mut e = Engine::new(serde_json::from_value(c["story"].clone()).unwrap());
            e.start();
            let mut trace = vec![e.token()];
            for i in c["inputs"].as_array().unwrap() {
                let i = i.as_str().unwrap();
                match i {
                    "next" => e.next(),
                    "restart" => e.start(),
                    _ => e.choose(i.strip_prefix("choose:").unwrap().parse().unwrap()),
                }
                trace.push(e.token());
            }
            let expected: Vec<String> = serde_json::from_value(c["trace"].clone()).unwrap();
            assert_eq!(trace, expected, "{}", path.display());
            let mut items = e.items.clone();
            items.sort();
            let mut exp_items: Vec<String> = serde_json::from_value(c["final"]["items"].clone()).unwrap();
            exp_items.sort();
            assert_eq!(items, exp_items, "{}", path.display());
            for (k, v) in c["final"]["vars"].as_object().unwrap() {
                assert_eq!(e.vars.get(k).copied().unwrap_or(0) as i64, v.as_i64().unwrap(), "{}", path.display());
            }
            count += 1;
        }
        assert!(count >= 4);
    }
}
