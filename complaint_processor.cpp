#include <algorithm>
#include <cctype>
#include <iostream>
#include <iterator>
#include <queue>
#include <sstream>
#include <string>
#include <unordered_map>
#include <unordered_set>
#include <vector>

using namespace std;

string lowercase(string value) {
    transform(value.begin(), value.end(), value.begin(),
              [](unsigned char c) { return static_cast<char>(tolower(c)); });
    return value;
}

int priorityRank(const string& priority) {
    const string value = lowercase(priority);
    if (value == "high") return 3;
    if (value == "medium") return 2;
    return 1;
}

struct ComplaintItem {
    int priority;
    size_t sequence;
    string id;
};

struct HigherPriorityFirst {
    bool operator()(const ComplaintItem& left, const ComplaintItem& right) const {
        if (left.priority != right.priority) return left.priority < right.priority;
        // Input arrives newest-first, so preserve that order for equal priorities.
        return left.sequence > right.sequence;
    }
};

int rankComplaintQueue() {
    priority_queue<ComplaintItem, vector<ComplaintItem>, HigherPriorityFirst> queue;
    string line;
    size_t sequence = 0;

    while (getline(cin, line)) {
        istringstream row(line);
        string id;
        string priority;
        if (!getline(row, id, '\t') || !getline(row, priority)) continue;
        if (!id.empty()) queue.push({priorityRank(priority), sequence++, id});
    }

    while (!queue.empty()) {
        cout << queue.top().id << '\n';
        queue.pop();
    }
    return 0;
}

int calculateStatistics() {
    unordered_map<string, size_t> categoryCounts;
    unordered_map<string, size_t> statusCounts;
    string line;
    size_t total = 0;
    while (getline(cin, line)) {
        istringstream row(line);
        string category;
        string status;
        if (!getline(row, category, '\t') || !getline(row, status) || category.empty()) continue;
        ++categoryCounts[category];
        ++statusCounts[status.empty() ? "Submitted" : status];
        ++total;
    }

    cout << "TOTAL\t" << total << '\n';
    for (const auto& entry : categoryCounts) {
        cout << "CATEGORY\t" << entry.first << '\t' << entry.second << '\n';
    }
    for (const auto& entry : statusCounts) {
        cout << "STATUS\t" << entry.first << '\t' << entry.second << '\n';
    }
    return 0;
}
string recommendedDepartment(const string& category) {
    if (category == "IT") return "IT";
    if (category == "Electrical") return "Electrical";
    if (category == "Water and Plumbing") return "Maintenance";
    if (category == "Safety and Security") return "Security";
    if (category == "Cleanliness and Sanitation") return "Housekeeping";
    if (category == "Hostel") return "Hostel";
    if (category == "Laboratory") return "Laboratory";
    if (category == "Library") return "Library";
    if (category == "Administrative") return "Administration";
    if (category == "Furniture and Classroom") return "Facilities";
    return "Administration";
}

unordered_set<string> complaintWords(const string& text) {
    static const unordered_set<string> ignored = {
        "the", "a", "an", "is", "are", "was", "were", "in", "on", "at",
        "to", "of", "for", "and", "or", "my", "our", "this", "that",
        "it", "there", "with", "not", "please", "issue", "problem", "complaint"
    };
    unordered_set<string> words;
    string word;
    for (unsigned char character : lowercase(text)) {
        if (isalnum(character)) {
            word.push_back(static_cast<char>(character));
        } else if (!word.empty()) {
            if (word.size() > 1 && ignored.find(word) == ignored.end()) words.insert(word);
            word.clear();
        }
    }
    if (word.size() > 1 && ignored.find(word) == ignored.end()) words.insert(word);
    return words;
}

int detectPossibleDuplicates() {
    string candidateText;
    if (!getline(cin, candidateText)) return 0;
    const unordered_set<string> candidate = complaintWords(candidateText);
    if (candidate.size() < 2) return 0;

    string line;
    while (getline(cin, line)) {
        istringstream row(line);
        string id;
        string oldText;
        if (!getline(row, id, '\t') || !getline(row, oldText) || id.empty()) continue;

        const unordered_set<string> previous = complaintWords(oldText);
        if (previous.size() < 2) continue;
        size_t overlap = 0;
        for (const string& word : candidate) {
            if (previous.find(word) != previous.end()) ++overlap;
        }
        const size_t unionSize = candidate.size() + previous.size() - overlap;
        const double similarity = unionSize ? static_cast<double>(overlap) / unionSize : 0.0;
        if (overlap >= 2 && similarity >= 0.45) cout << id << '\n';
    }
    return 0;
}
int analyzeComplaint() {
    // Read the complete title and description, including multiple lines.
    const string complaint = lowercase(string(istreambuf_iterator<char>(cin), istreambuf_iterator<char>()));

    // Hash map (unordered_map): complaint keywords map to their category.
    const unordered_map<string, string> keywordCategory = {
        {"security", "Safety and Security"}, {"unsafe", "Safety and Security"},
        {"broken lock", "Safety and Security"}, {"theft", "Safety and Security"},
        {"stolen", "Safety and Security"}, {"harass", "Safety and Security"},
        {"bullying", "Safety and Security"}, {"fire", "Safety and Security"},
        {"smoke", "Safety and Security"}, {"emergency", "Safety and Security"},
        {"suraksha", "Safety and Security"}, {"chori", "Safety and Security"},
        {"maar-peet", "Safety and Security"},
        {"electric", "Electrical"}, {"wiring", "Electrical"}, {"wire", "Electrical"},
        {"fan", "Electrical"}, {"light", "Electrical"}, {"bulb", "Electrical"},
        {"power", "Electrical"}, {"bijli", "Electrical"}, {"pankha", "Electrical"},
        {"current", "Electrical"}, {"water", "Water and Plumbing"},
        {"leak", "Water and Plumbing"}, {"pipe", "Water and Plumbing"},
        {"tap", "Water and Plumbing"}, {"drain", "Water and Plumbing"},
        {"plumbing", "Water and Plumbing"}, {"toilet", "Water and Plumbing"},
        {"washroom", "Water and Plumbing"}, {"flood", "Water and Plumbing"},
        {"pani", "Water and Plumbing"}, {"nal", "Water and Plumbing"},
        {"sewer", "Water and Plumbing"}, {"wifi", "IT"}, {"wi-fi", "IT"},
        {"internet", "IT"}, {"network", "IT"}, {"computer", "IT"},
        {"projector", "IT"}, {"printer", "IT"}, {"software", "IT"},
        {"online class", "IT"}, {"router", "IT"},
        {"laboratory", "Laboratory"}, {"lab equipment", "Laboratory"},
        {"experiment", "Laboratory"}, {"chemical", "Laboratory"},
        {"microscope", "Laboratory"}, {"lab", "Laboratory"},
        {"clean", "Cleanliness and Sanitation"}, {"garbage", "Cleanliness and Sanitation"},
        {"dustbin", "Cleanliness and Sanitation"}, {"dirty", "Cleanliness and Sanitation"},
        {"waste", "Cleanliness and Sanitation"}, {"sanitation", "Cleanliness and Sanitation"},
        {"safai", "Cleanliness and Sanitation"}, {"kachra", "Cleanliness and Sanitation"},
        {"gandagi", "Cleanliness and Sanitation"}, {"hostel", "Hostel"},
        {"dorm", "Hostel"}, {"room", "Hostel"}, {"warden", "Hostel"},
        {"mess food", "Hostel"}, {"hostel food", "Hostel"},
        {"library", "Library"}, {"book", "Library"}, {"reading room", "Library"},
        {"librarian", "Library"}, {"certificate", "Administrative"},
        {"id card", "Administrative"}, {"administration", "Administrative"},
        {"admission", "Administrative"}, {"fee", "Administrative"},
        {"scholarship", "Administrative"}, {"exam result", "Administrative"},
        {"chair", "Furniture and Classroom"}, {"table", "Furniture and Classroom"},
        {"desk", "Furniture and Classroom"}, {"bench", "Furniture and Classroom"},
        {"furniture", "Furniture and Classroom"}, {"classroom", "Furniture and Classroom"},
        {"blackboard", "Furniture and Classroom"}
    };

    // If multiple keyword groups match, choose the most specific/severe category.
    const unordered_map<string, int> categoryWeight = {
        {"Safety and Security", 100}, {"Electrical", 90}, {"Water and Plumbing", 85},
        {"IT", 80}, {"Laboratory", 70}, {"Cleanliness and Sanitation", 65},
        {"Hostel", 60}, {"Library", 50}, {"Administrative", 45},
        {"Furniture and Classroom", 40}
    };
    string category = "Other";
    int bestWeight = 0;
    for (const auto& entry : keywordCategory) {
        if (complaint.find(entry.first) == string::npos) continue;
        const int weight = categoryWeight.at(entry.second);
        if (weight > bestWeight) {
            category = entry.second;
            bestWeight = weight;
        }
    }

    const unordered_set<string> urgentKeywords = {
        "fire", "smoke", "spark", "flood", "flooding", "major leak",
        "exposed wire", "electric shock", "emergency", "urgent", "accident",
        "assault", "threat", "unsafe", "aag", "dhuan", "karant", "baadh"
    };
    bool urgent = false;
    for (const string& keyword : urgentKeywords) {
        if (complaint.find(keyword) != string::npos) {
            urgent = true;
            break;
        }
    }

    string priority = "Low";
    if (urgent) {
        priority = "High";
    } else if (category == "Electrical" || category == "Water and Plumbing" ||
               category == "IT" || category == "Safety and Security" ||
               category == "Laboratory" || category == "Hostel") {
        priority = "Medium";
    }

    cout << "Category: " << category << '\n';
    cout << "Priority: " << priority << '\n';
    cout << "Assignment: Recommended department: " << recommendedDepartment(category) << '\n';
    return 0;
}

int main(int argc, char* argv[]) {
    if (argc > 1 && string(argv[1]) == "--rank") return rankComplaintQueue();
    if (argc > 1 && string(argv[1]) == "--duplicates") return detectPossibleDuplicates();
    if (argc > 1 && string(argv[1]) == "--stats") return calculateStatistics();
    return analyzeComplaint();
}
