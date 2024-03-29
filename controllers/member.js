const Member = require("../models/member");
const catchAsync = require("../utils/catchAsync");
const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: "dcbjngmhn",
  api_key: "665934251338653",
  api_secret: "oIwQNFFVAD1zJI6OAIskq2ie8uk",
});

exports.getAllMembers = catchAsync(async (req, res, next) => {
  // GET MEMBERS BY TREE

  const familyTreeId = req.params.id; // Assuming req.params.id represents familyTreeId
  const allMembers = await Member.find({ familyTreeId: familyTreeId });
  console.log(allMembers);

  // const orgChart = transformDataToHierarchy(allMembers);
  // console.log(orgChart);

  res.json(allMembers);
});

// function transformDataToHierarchy(allMembers) {
//   const memberMap = new Map();

//   // First pass: Create a mapping of members using their IDs
//   allMembers.forEach((member) => {
//     memberMap.set(member._id.toString(), {
//       name: member.name,
//       attributes: {
//         gender: member.gender,
//       },
//       spouseId: member.spouseId, // Add spouseId field
//       children: [], // Initialize children array
//     });
//   });

//   // Second pass: Build the hierarchy using the parentId references
//   const hierarchy = { name: "Root", children: [] };

//   allMembers.forEach((member) => {
//     const node = memberMap.get(member._id.toString());
//     const parent = member.parentId
//       ? memberMap.get(member.parentId.toString())
//       : hierarchy;

//     if (parent) {
//       if (member.spouseId) {
//         // If the member has a spouse, add the spouse next to the member
//         const spouseNode = memberMap.get(member.spouseId.toString());
//         parent.children.push(node, spouseNode);
//       } else {
//         // If no spouse, add the member as a child of the parent
//         parent.children.push(node);
//       }
//     }
//   });

//   return hierarchy.children;
// }

// function transformDataToHierarchy(allMembers) {
//   const memberMap = new Map();

//   // First pass: Create a mapping of members using their IDs
//   allMembers.forEach((member) => {
//     memberMap.set(member._id.toString(), {
//       name: member.name,
//       attributes: {
//         gender: member.gender,
//         // dateOfBirth: member.dateOfBirth,
//       },
//       children: [],
//     });
//   });

//   // Second pass: Build the hierarchy using the parentId references
//   const hierarchy = { name: "Root", children: [] };

//   allMembers.forEach((member) => {
//     const node = memberMap.get(member._id.toString());
//     const parent = member.parentId
//       ? memberMap.get(member.parentId.toString())
//       : hierarchy;

//     if (parent) {
//       parent.children.push(node);
//     }
//   });

//   return hierarchy.children;
// }

// exports.getMemberById = catchAsync(async (req, res, next) => {
//   const member = await Member.findById(req.params.id);
//   if (!member) {
//     return res.status(404).json({ message: "Member not found" });
//   }
//   res.json(member);
// });

exports.getMemberById = catchAsync(async (req, res, next) => {
  const id = req.params.id;

  const member = await Member.find({ id: id });

  if (!member) {
    return res.status(404).json({ message: "Member not found" });
  }

  res.json(member);
});

// Check if a member with the same name already exists in the family tree
// const existingMember = await Member.findOne({ name, familyTreeId });

// if (existingMember) {
//   return res.status(400).json({
//     message: "A member with the same name already exists in the family tree.",
//   });
// }

exports.createMember = catchAsync(async (req, res, next) => {
  const { name, gender, rootMember, img, mid, fid, pids, familyTreeId } =
    req.body;

  // CREATING A SPOUSE

  // If no existing member found, create a new member
  const member = new Member({
    name,
    gender,
    rootMember,
    img,
    mid,
    fid,
    pids,
    familyTreeId,
  });

  const newMember = await member.save();
  console.log(newMember);

  res.status(201).json({ newMember });
});

// CREATING A SPOUSE
exports.createSpouse = catchAsync(async (req, res, next) => {
  const { name, gender, img, familyTreeId } = req.body;

  // Assuming req.body.pids contains the partner id
  const partnerId = req.body.pids;
  console.log("PARTNER", partnerId);
  // Create the new spouse
  const newSpouse = new Member({
    name,
    gender,
    img,
    pids: [partnerId], // Add the partner id to the new spouse's pids
    familyTreeId,
  });

  const newSpouseDocument = await newSpouse.save();

  // Fetch the existing spouse
  const existingSpouse = await Member.find({ id: partnerId });
  console.log("EXISTING", existingSpouse);
  // Update the existing spouse's pids to include the new spouse
  if (existingSpouse) {
    existingSpouse[0].pids.push(newSpouseDocument.id);
    await existingSpouse[0].save();
  }
  res.status(201).json({ newSpouseDocument });
});

// GETTING SPOUSE NAMES

exports.getSpouses = catchAsync(async (req, res, next) => {
  const pidsArray = req.body.pidsArray;

  const users = await Member.find({ id: { $in: pidsArray } });
  const userNamesAndIds = users.map((user) => {
    return { name: user.name, id: user.id };
  });

  res.json(userNamesAndIds);
});

// CREATING PARENTS

// CREATING PARENTS
exports.createParents = catchAsync(async (req, res, next) => {
  const { motherName, fatherName, familyTreeId } = req.body;

  // Assuming req.body.childId contains the child's id
  const childId = req.body.childId;

  // Create the mother and father objects
  const mother = new Member({
    name: motherName,
    gender: "female", // Assuming female for the mother
    pids: [], // Initialize the pids array for now
    familyTreeId,
  });

  const father = new Member({
    name: fatherName,
    gender: "male", // Assuming male for the father
    pids: [], // Initialize the pids array for now
    familyTreeId,
  });

  // Save the mother and father documents
  const motherDocument = await mother.save();
  const fatherDocument = await father.save();

  // Fetch the child
  const child = await Member.find({ id: childId });

  // Update the child's mid (motherId) and fid (fatherId) fields
  if (child.length > 0) {
    child[0].mid = motherDocument.id;
    child[0].fid = fatherDocument.id;
    await child[0].save();
  }

  // Fetch the mother and father
  const motherUpdate = await Member.find({ id: motherDocument.id });
  const fatherUpdate = await Member.find({ id: fatherDocument.id });

  // Update the pids array for both mother and father
  if (motherUpdate.length > 0 && fatherUpdate.length > 0) {
    motherUpdate[0].pids.push(fatherDocument.id);
    fatherUpdate[0].pids.push(motherDocument.id);
    await motherUpdate[0].save();
    await fatherUpdate[0].save();
  }
  res
    .status(201)
    .json({ mother: motherDocument, father: fatherDocument, child });
});

// CREATING CHILDS

// CREATING A CHILD

exports.createChild = catchAsync(async (req, res, next) => {
  const { name, gender, motherId, fatherId, familyTreeId } = req.body;
  // Assuming req.body.pids contains the partner id
  const partnerId = req.body?.pids; // This should be parent id tthen we will wind the parent thriugh id then we will check its pidsSArray if array is empty create new spouse if array  is not empty then move to else block

  console.log(motherId, fatherId, partnerId);
  let parent = [];

  if (partnerId) {
    parent = await Member.find({ id: partnerId });
  }

  // console.log(parent[0].pids);s
  if (parent[0]?.pids.length === 0) {
    // Create the new spouse
    let newSpouseDocument;
    if (parent[0].gender === "male") {
      const newSpouse = new Member({
        name: "Spouse",
        gender: "female",
        pids: [partnerId], // Add the partner id to the new spouse's pids
        familyTreeId,
      });
      newSpouseDocument = await newSpouse.save();
    } else if (parent[0].gender === "female") {
      const newSpouse = new Member({
        name: "Spouse",
        gender: "male",
        pids: [partnerId], // Add the partner id to the new spouse's pids
        familyTreeId,
      });
      newSpouseDocument = await newSpouse.save();
    }

    // Fetch the existing spouse
    const existingSpouse = await Member.find({ id: partnerId });

    // Update the existing spouse's pids to include the new spouse
    if (existingSpouse) {
      existingSpouse[0].pids.push(newSpouseDocument.id);
      await existingSpouse[0].save();
    }

    let childDocument;

    if (fatherId) {
      const child = new Member({
        name: name,
        gender: gender,
        mid: newSpouseDocument.id,
        fid: fatherId,
        familyTreeId,
      });
      childDocument = await child.save();
    } else if (motherId) {
      const child = new Member({
        name: name,
        gender: gender,
        mid: motherId,
        fid: newSpouseDocument.id,
        familyTreeId,
      });
      childDocument = await child.save();
    }
    res.json({ data: childDocument });
  } else {
    const child = new Member({
      name: name,
      gender: gender,
      mid: motherId,
      fid: fatherId,
      familyTreeId,
    });
    const childDocument = await child.save();
    res.json({ data: childDocument });
  }
});

// exports.createChild = catchAsync(async (req, res, next) => {
//   const { name, gender, familyTreeId, motherId, fatherId } = req.body;

//   // Check if the member already has a spouse
//   const existingSpouse = await Member.findOne({
//     pids: { $in: [motherId, fatherId] },
//   });

//   if (!existingSpouse) {
//     // If the member doesn't have a spouse, create a spouse first
//     const spouse = new Member({
//       name: "Spouse", // You can customize the spouse details
//       gender: "Unknown", // You can customize the spouse details
//       pids: [motherId, fatherId],
//       familyTreeId,
//     });

//     const spouseDocument = await spouse.save();

//     // Update the pids array for both member and spouse
//     await Member.findByIdAndUpdate(motherId, {
//       $push: { pids: spouseDocument.id },
//     });

//     await Member.findByIdAndUpdate(fatherId, {
//       $push: { pids: spouseDocument.id },
//     });

//     // Now, continue with creating the child
//     const child = new Member({
//       name: name,
//       gender: gender,
//       mid: motherId,
//       fid: fatherId,
//       familyTreeId,
//     });

//     const childDocument = await child.save();

//     res.status(201).json({ childDocument, spouseDocument });
//   } else {
//     // If the member already has a spouse, create the child and update mid and fid
//     const child = new Member({
//       name: name,
//       gender: gender,
//       mid: motherId,
//       fid: fatherId,
//       familyTreeId,
//     });

//     const childDocument = await child.save();

//     // Update mid and fid for the child
//     await Member.findByIdAndUpdate(
//       childDocument._id,
//       { $set: { mid: motherId, fid: fatherId } },
//       { new: true }
//     );

//     res.status(201).json({ childDocument });
//   }
// });

// exports.updateMember = catchAsync(async (req, res, next) => {
//   const { id } = req.params;
//   const updateFields = {};
//   for (const field in req.body) {
//     updateFields[field] = req.body[field];
//   }

//   const member = await Member.findByIdAndUpdate(
//     id,
//     { $set: updateFields },
//     { new: true }
//   );

//   if (!member) {
//     return res.status(404).json({ message: "Member not found" });
//   }

//   res.json(member);
// });

// --------------------------------------------------------------------------------- //

// Assuming you have already configured Cloudinary as mentioned earlier

exports.updateMember = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { name, gender, dob, dod } = req.body;
  console.log("YO", req.body);

  let imageUrl;

  // Check if an image file is included in the request
  if (req.files && req.files.img) {
    try {
      // Upload the new image to Cloudinary
      const file = req.files.img;
      imageUrl = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload(file.tempFilePath, (err, result) => {
          if (err) {
            console.error(err);
            reject("Error uploading image to Cloudinary");
          } else {
            console.log(result);
            resolve(result.url);
          }
        });
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: error });
    }
  }

  // Find the member to update
  const memberToUpdate = await Member.findOne({ id: id });

  if (!memberToUpdate) {
    return res.status(404).json({ message: "Member not found" });
  }

  // Update the member with the new fields, including the image if provided
  memberToUpdate.name = name;
  memberToUpdate.gender = gender;
  memberToUpdate.img = imageUrl || memberToUpdate.img; // Use existing image if no new image
  memberToUpdate.dob = dob;
  memberToUpdate.dod = dod;

  const updatedMember = await memberToUpdate.save();
  console.log(updatedMember);
  res.json(updatedMember);
});

// exports.deleteMemberAndRelatedMembers = catchAsync(async (req, res, next) => {
//   const memberId = req.params.id;

//   // Find and delete the member
//   const deletedMember = await Member.findOneAndDelete({ id: memberId });

//   if (!deletedMember) {
//     return res.status(404).json({ message: "Member not found" });
//   }

//   // Delete all other members with the member's id in their mid or fid field
//   await Member.deleteMany({ $or: [{ mid: memberId }, { fid: memberId }] });

//   res.json({ message: "Member and related members deleted successfully" });
// });

exports.deleteMemberAndRelatedMembers = catchAsync(async (req, res, next) => {
  const memberId = req.params.id;

  // Step 1: Find and delete the member
  const deletedMember = await Member.findOneAndDelete({ id: memberId });

  if (!deletedMember) {
    return res.status(404).json({ message: "Member not found" });
  }

  // Step 2: Delete all other members with the member's id in their mid or fid field
  await Member.deleteMany({ $or: [{ mid: memberId }, { fid: memberId }] });

  // Step 3: Get the IDs from the pidsArray of the member being deleted
  const deletedMemberPids = deletedMember.pids;
  console.log("Deleted Member Pids:", deletedMemberPids);

  // Step 4: Find all members whose pidsArray contains any of these IDs
  const membersToUpdate = await Member.find({
    pids: { $elemMatch: { $in: deletedMemberPids } },
  });

  console.log("Members to Update:", membersToUpdate);

  // Step 5: Remove the ID of the member being deleted from the pidsArray of other members
  for (const memberToUpdate of membersToUpdate) {
    console.log("Updating Member:", memberToUpdate);
    memberToUpdate.pids = memberToUpdate.pids.filter((pid) => pid !== memberId);
    await memberToUpdate.save();
  }

  res.json({ message: "Member and related members deleted successfully" });
});
