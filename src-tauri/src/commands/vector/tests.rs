#[cfg(test)]
mod tests {
    use crate::commands::vector::*;
    use std::sync::Arc;
    use tempfile::tempdir;
    use serde_json::json;

    fn create_test_state() -> Arc<VectorStoreState> {
        let temp_dir = tempdir().unwrap();
        let temp_path = temp_dir.path().join("test_vector_store.json");
        Arc::new(VectorStoreState::new(temp_path).unwrap())
    }

    #[test]
    fn test_collection_meta_serialization() {
        let meta = CollectionMeta {
            name: "test".to_string(),
            dimension: 384,
            metadata: Some(json!({"type": "test"})),
            document_count: 0,
            created_at: 1640995200,
            updated_at: 1640995200,
            description: Some("Test collection".to_string()),
            embedding_model: Some("text-embedding-3-small".to_string()),
            embedding_provider: Some("openai".to_string()),
        };

        let serialized = serde_json::to_string(&meta).unwrap();
        let deserialized: CollectionMeta = serde_json::from_str(&serialized).unwrap();

        assert_eq!(meta.name, deserialized.name);
        assert_eq!(meta.dimension, deserialized.dimension);
        assert_eq!(meta.description, deserialized.description);
        assert_eq!(meta.embedding_model, deserialized.embedding_model);
        assert_eq!(meta.embedding_provider, deserialized.embedding_provider);
    }

    #[test]
    fn test_create_collection_success() {
        let state = create_test_state();
        let payload = CreateCollectionPayload {
            name: "test_collection".to_string(),
            dimension: 384,
            metadata: Some(json!({"type": "test"})),
            description: Some("Test collection".to_string()),
            embedding_model: Some("text-embedding-3-small".to_string()),
            embedding_provider: Some("openai".to_string()),
        };

        let result = vector_create_collection(state.clone().into(), payload);
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), true);

        // Verify collection was created
        let data = state.data.lock();
        assert!(data.collections.contains_key("test_collection"));
        let collection = &data.collections["test_collection"];
        assert_eq!(collection.name, "test_collection");
        assert_eq!(collection.dimension, 384);
        assert_eq!(collection.description, Some("Test collection".to_string()));
        assert_eq!(collection.embedding_model, Some("text-embedding-3-small".to_string()));
        assert_eq!(collection.embedding_provider, Some("openai".to_string()));
    }

    #[test]
    fn test_create_collection_duplicate_name() {
        let state = create_test_state();
        let payload = CreateCollectionPayload {
            name: "duplicate_test".to_string(),
            dimension: 384,
            metadata: None,
            description: None,
            embedding_model: None,
            embedding_provider: None,
        };

        // Create first collection
        let result1 = vector_create_collection(tauri::State::from(state.clone()), payload.clone());
        assert!(result1.is_ok());

        // Try to create duplicate with same dimension - should succeed
        let result2 = vector_create_collection(tauri::State::from(state.clone()), payload);
        assert!(result2.is_ok());

        // Try to create duplicate with different dimension - should fail
        let payload_different = CreateCollectionPayload {
            name: "duplicate_test".to_string(),
            dimension: 768,
            metadata: None,
            description: None,
            embedding_model: None,
            embedding_provider: None,
        };
        let result3 = vector_create_collection(tauri::State::from(state.clone()), payload_different);
        assert!(result3.is_err());
        assert!(result3.unwrap_err().contains("different dimension"));
    }

    #[test]
    fn test_delete_collection() {
        let state = create_test_state();
        
        // First create a collection
        let payload = CreateCollectionPayload {
            name: "to_delete".to_string(),
            dimension: 384,
            metadata: None,
            description: None,
            embedding_model: None,
            embedding_provider: None,
        };
        vector_create_collection(tauri::State::from(state.clone()), payload).unwrap();

        // Verify it exists
        {
            let data = state.data.lock();
            assert!(data.collections.contains_key("to_delete"));
        }

        // Delete it
        let result = vector_delete_collection(tauri::State::from(state.clone()), "to_delete".to_string());
        assert!(result.is_ok());

        // Verify it's gone
        let data = state.data.lock();
        assert!(!data.collections.contains_key("to_delete"));
        assert!(!data.points.contains_key("to_delete"));
    }

    #[test]
    fn test_rename_collection() {
        let state = create_test_state();
        
        // Create a collection
        let payload = CreateCollectionPayload {
            name: "old_name".to_string(),
            dimension: 384,
            metadata: Some(json!({"test": "data"})),
            description: Some("Original description".to_string()),
            embedding_model: Some("test-model".to_string()),
            embedding_provider: Some("test-provider".to_string()),
        };
        vector_create_collection(tauri::State::from(state.clone()), payload).unwrap();

        // Rename it
        let result = vector_rename_collection(
            tauri::State::from(state.clone()), 
            "old_name".to_string(), 
            "new_name".to_string()
        );
        assert!(result.is_ok());

        // Verify rename
        let data = state.data.lock();
        assert!(!data.collections.contains_key("old_name"));
        assert!(data.collections.contains_key("new_name"));
        
        let collection = &data.collections["new_name"];
        assert_eq!(collection.name, "new_name");
        assert_eq!(collection.description, Some("Original description".to_string()));
        assert_eq!(collection.embedding_model, Some("test-model".to_string()));
        assert_eq!(collection.embedding_provider, Some("test-provider".to_string()));
    }

    #[test]
    fn test_rename_collection_errors() {
        let state = create_test_state();
        
        // Try to rename non-existent collection
        let result1 = vector_rename_collection(
            tauri::State::from(state.clone()), 
            "nonexistent".to_string(), 
            "new_name".to_string()
        );
        assert!(result1.is_err());
        assert!(result1.unwrap_err().contains("not found"));

        // Create two collections
        let payload1 = CreateCollectionPayload {
            name: "collection1".to_string(),
            dimension: 384,
            metadata: None,
            description: None,
            embedding_model: None,
            embedding_provider: None,
        };
        let payload2 = CreateCollectionPayload {
            name: "collection2".to_string(),
            dimension: 384,
            metadata: None,
            description: None,
            embedding_model: None,
            embedding_provider: None,
        };
        vector_create_collection(tauri::State::from(state.clone()), payload1).unwrap();
        vector_create_collection(tauri::State::from(state.clone()), payload2).unwrap();

        // Try to rename to existing name
        let result2 = vector_rename_collection(
            tauri::State::from(state.clone()), 
            "collection1".to_string(), 
            "collection2".to_string()
        );
        assert!(result2.is_err());
        assert!(result2.unwrap_err().contains("already exists"));
    }

    #[test]
    fn test_truncate_collection() {
        let state = create_test_state();
        
        // Create collection and add some points
        let payload = CreateCollectionPayload {
            name: "to_truncate".to_string(),
            dimension: 2,
            metadata: None,
            description: None,
            embedding_model: None,
            embedding_provider: None,
        };
        vector_create_collection(tauri::State::from(state.clone()), payload).unwrap();

        // Add some points
        let points = vec![
            UpsertPoint {
                id: "point1".to_string(),
                vector: vec![0.1, 0.2],
                payload: Some(json!({"test": "data1"})),
            },
            UpsertPoint {
                id: "point2".to_string(),
                vector: vec![0.3, 0.4],
                payload: Some(json!({"test": "data2"})),
            },
        ];
        vector_upsert_points(tauri::State::from(state.clone()), "to_truncate".to_string(), points).unwrap();

        // Verify points exist
        {
            let data = state.data.lock();
            assert_eq!(data.points["to_truncate"].len(), 2);
            assert_eq!(data.collections["to_truncate"].document_count, 2);
        }

        // Truncate collection
        let result = vector_truncate_collection(tauri::State::from(state.clone()), "to_truncate".to_string());
        assert!(result.is_ok());

        // Verify collection is empty but still exists
        let data = state.data.lock();
        assert!(data.collections.contains_key("to_truncate"));
        assert_eq!(data.points["to_truncate"].len(), 0);
        assert_eq!(data.collections["to_truncate"].document_count, 0);
    }

    #[test]
    fn test_truncate_nonexistent_collection() {
        let state = create_test_state();
        
        let result = vector_truncate_collection(tauri::State::from(state.clone()), "nonexistent".to_string());
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("not found"));
    }

    #[test]
    fn test_list_collections() {
        let state = create_test_state();
        
        // Test empty list
        let result = vector_list_collections(tauri::State::from(state.clone()));
        assert!(result.is_ok());
        assert_eq!(result.unwrap().len(), 0);

        // Create collections
        let payloads = vec![
            CreateCollectionPayload {
                name: "collection1".to_string(),
                dimension: 384,
                metadata: Some(json!({"type": "test1"})),
                description: Some("First collection".to_string()),
                embedding_model: Some("model1".to_string()),
                embedding_provider: Some("provider1".to_string()),
            },
            CreateCollectionPayload {
                name: "collection2".to_string(),
                dimension: 768,
                metadata: Some(json!({"type": "test2"})),
                description: Some("Second collection".to_string()),
                embedding_model: Some("model2".to_string()),
                embedding_provider: Some("provider2".to_string()),
            },
        ];

        for payload in payloads {
            vector_create_collection(tauri::State::from(state.clone()), payload).unwrap();
        }

        // List collections
        let result = vector_list_collections(tauri::State::from(state.clone()));
        assert!(result.is_ok());
        let collections = result.unwrap();
        assert_eq!(collections.len(), 2);

        // Find collections by name
        let col1 = collections.iter().find(|c| c.name == "collection1").unwrap();
        let col2 = collections.iter().find(|c| c.name == "collection2").unwrap();

        assert_eq!(col1.dimension, 384);
        assert_eq!(col1.description, Some("First collection".to_string()));
        assert_eq!(col1.embedding_model, Some("model1".to_string()));
        assert_eq!(col1.embedding_provider, Some("provider1".to_string()));
        
        assert_eq!(col2.dimension, 768);
        assert_eq!(col2.description, Some("Second collection".to_string()));
        assert_eq!(col2.embedding_model, Some("model2".to_string()));
        assert_eq!(col2.embedding_provider, Some("provider2".to_string()));
    }

    #[test]
    fn test_get_collection() {
        let state = create_test_state();
        
        // Test non-existent collection
        let result = vector_get_collection(tauri::State::from(state.clone()), "nonexistent".to_string());
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("not found"));

        // Create a collection
        let payload = CreateCollectionPayload {
            name: "test_get".to_string(),
            dimension: 384,
            metadata: Some(json!({"test": "metadata"})),
            description: Some("Test get collection".to_string()),
            embedding_model: Some("test-model".to_string()),
            embedding_provider: Some("test-provider".to_string()),
        };
        vector_create_collection(tauri::State::from(state.clone()), payload).unwrap();

        // Get the collection
        let result = vector_get_collection(tauri::State::from(state.clone()), "test_get".to_string());
        assert!(result.is_ok());
        let collection = result.unwrap();

        assert_eq!(collection.name, "test_get");
        assert_eq!(collection.dimension, 384);
        assert_eq!(collection.description, Some("Test get collection".to_string()));
        assert_eq!(collection.embedding_model, Some("test-model".to_string()));
        assert_eq!(collection.embedding_provider, Some("test-provider".to_string()));
        assert_eq!(collection.document_count, 0);
    }

    #[test]
    fn test_cosine_similarity() {
        let vec1 = vec![1.0, 0.0, 0.0];
        let vec2 = vec![0.0, 1.0, 0.0];
        let vec3 = vec![1.0, 0.0, 0.0];

        // Orthogonal vectors should have similarity 0
        assert!((cosine_similarity(&vec1, &vec2) - 0.0).abs() < 1e-10);

        // Identical vectors should have similarity 1
        assert!((cosine_similarity(&vec1, &vec3) - 1.0).abs() < 1e-10);

        // Test with normalized vectors
        let vec4 = vec![0.6, 0.8];
        let vec5 = vec![0.8, 0.6];
        let similarity = cosine_similarity(&vec4, &vec5);
        assert!(similarity > 0.0 && similarity < 1.0);
    }

    #[test]
    fn test_default_timestamp() {
        let timestamp1 = default_timestamp();
        std::thread::sleep(std::time::Duration::from_millis(1));
        let timestamp2 = default_timestamp();
        
        assert!(timestamp2 >= timestamp1);
        assert!(timestamp2 - timestamp1 <= 1); // Should be within 1 second
    }

    #[test]
    fn test_upsert_points() {
        let state = create_test_state();
        
        // Create collection
        let payload = CreateCollectionPayload {
            name: "test_upsert".to_string(),
            dimension: 3,
            metadata: None,
            description: None,
            embedding_model: None,
            embedding_provider: None,
        };
        vector_create_collection(tauri::State::from(state.clone()), payload).unwrap();

        // Add points
        let points = vec![
            UpsertPoint {
                id: "point1".to_string(),
                vector: vec![0.1, 0.2, 0.3],
                payload: Some(json!({"category": "A", "score": 85})),
            },
            UpsertPoint {
                id: "point2".to_string(),
                vector: vec![0.4, 0.5, 0.6],
                payload: Some(json!({"category": "B", "score": 92})),
            },
        ];

        let result = vector_upsert_points(tauri::State::from(state.clone()), "test_upsert".to_string(), points);
        assert!(result.is_ok());

        // Verify points were added and document count updated
        let data = state.data.lock();
        assert_eq!(data.points["test_upsert"].len(), 2);
        assert_eq!(data.collections["test_upsert"].document_count, 2);
        
        let point1 = data.points["test_upsert"].iter().find(|p| p.id == "point1").unwrap();
        assert_eq!(point1.vector, vec![0.1, 0.2, 0.3]);
        assert_eq!(point1.payload.as_ref().unwrap()["category"], "A");
        assert_eq!(point1.payload.as_ref().unwrap()["score"], 85);
    }

    #[test]
    fn test_upsert_points_dimension_mismatch() {
        let state = create_test_state();
        
        // Create collection with dimension 2
        let payload = CreateCollectionPayload {
            name: "test_dim".to_string(),
            dimension: 2,
            metadata: None,
            description: None,
            embedding_model: None,
            embedding_provider: None,
        };
        vector_create_collection(tauri::State::from(state.clone()), payload).unwrap();

        // Try to add point with wrong dimension
        let points = vec![
            UpsertPoint {
                id: "bad_point".to_string(),
                vector: vec![0.1, 0.2, 0.3], // 3D vector for 2D collection
                payload: None,
            },
        ];

        let result = vector_upsert_points(tauri::State::from(state.clone()), "test_dim".to_string(), points);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("dimension mismatch"));
    }

    #[test]
    fn test_upsert_points_update_existing() {
        let state = create_test_state();
        
        // Create collection and add initial point
        let payload = CreateCollectionPayload {
            name: "test_update".to_string(),
            dimension: 2,
            metadata: None,
            description: None,
            embedding_model: None,
            embedding_provider: None,
        };
        vector_create_collection(tauri::State::from(state.clone()), payload).unwrap();

        let initial_points = vec![
            UpsertPoint {
                id: "update_me".to_string(),
                vector: vec![0.1, 0.2],
                payload: Some(json!({"version": 1})),
            },
        ];
        vector_upsert_points(tauri::State::from(state.clone()), "test_update".to_string(), initial_points).unwrap();

        // Update the same point
        let updated_points = vec![
            UpsertPoint {
                id: "update_me".to_string(),
                vector: vec![0.3, 0.4],
                payload: Some(json!({"version": 2})),
            },
        ];
        vector_upsert_points(tauri::State::from(state.clone()), "test_update".to_string(), updated_points).unwrap();

        // Verify update (should still be 1 point, not 2)
        let data = state.data.lock();
        assert_eq!(data.points["test_update"].len(), 1);
        assert_eq!(data.collections["test_update"].document_count, 1);
        
        let point = &data.points["test_update"][0];
        assert_eq!(point.vector, vec![0.3, 0.4]);
        assert_eq!(point.payload.as_ref().unwrap()["version"], 2);
    }

    #[test]
    fn test_delete_points() {
        let state = create_test_state();
        
        // Setup collection with points
        let payload = CreateCollectionPayload {
            name: "test_delete".to_string(),
            dimension: 2,
            metadata: None,
            description: None,
            embedding_model: None,
            embedding_provider: None,
        };
        vector_create_collection(tauri::State::from(state.clone()), payload).unwrap();

        let points = vec![
            UpsertPoint {
                id: "keep_me".to_string(),
                vector: vec![0.1, 0.2],
                payload: None,
            },
            UpsertPoint {
                id: "delete_me".to_string(),
                vector: vec![0.3, 0.4],
                payload: None,
            },
        ];
        vector_upsert_points(tauri::State::from(state.clone()), "test_delete".to_string(), points).unwrap();

        // Delete one point
        let result = vector_delete_points(tauri::State::from(state.clone()), "test_delete".to_string(), vec!["delete_me".to_string()]);
        assert!(result.is_ok());

        // Verify deletion and document count update
        let data = state.data.lock();
        assert_eq!(data.points["test_delete"].len(), 1);
        assert_eq!(data.collections["test_delete"].document_count, 1);
        assert_eq!(data.points["test_delete"][0].id, "keep_me");
    }

    #[test]
    fn test_get_points() {
        let state = create_test_state();
        
        // Setup collection with points
        let payload = CreateCollectionPayload {
            name: "test_get_points".to_string(),
            dimension: 2,
            metadata: None,
            description: None,
            embedding_model: None,
            embedding_provider: None,
        };
        vector_create_collection(tauri::State::from(state.clone()), payload).unwrap();

        let points = vec![
            UpsertPoint {
                id: "point1".to_string(),
                vector: vec![0.1, 0.2],
                payload: Some(json!({"data": "test1"})),
            },
            UpsertPoint {
                id: "point2".to_string(),
                vector: vec![0.3, 0.4],
                payload: Some(json!({"data": "test2"})),
            },
        ];
        vector_upsert_points(tauri::State::from(state.clone()), "test_get_points".to_string(), points).unwrap();

        // Get specific points
        let result = vector_get_points(tauri::State::from(state.clone()), "test_get_points".to_string(), vec!["point1".to_string()]);
        assert!(result.is_ok());
        let retrieved = result.unwrap();
        assert_eq!(retrieved.len(), 1);
        assert_eq!(retrieved[0].id, "point1");
        assert_eq!(retrieved[0].vector, vec![0.1, 0.2]);
    }

    #[test]
    fn test_search_points_basic() {
        let state = create_test_state();
        
        // Setup collection with points
        let payload = CreateCollectionPayload {
            name: "test_search".to_string(),
            dimension: 2,
            metadata: None,
            description: None,
            embedding_model: None,
            embedding_provider: None,
        };
        vector_create_collection(tauri::State::from(state.clone()), payload).unwrap();

        let points = vec![
            UpsertPoint {
                id: "point1".to_string(),
                vector: vec![1.0, 0.0], // Will have high similarity with [1,0] query
                payload: Some(json!({"category": "A"})),
            },
            UpsertPoint {
                id: "point2".to_string(),
                vector: vec![0.0, 1.0], // Will have low similarity with [1,0] query
                payload: Some(json!({"category": "B"})),
            },
        ];
        vector_upsert_points(tauri::State::from(state.clone()), "test_search".to_string(), points).unwrap();

        // Search with query vector [1.0, 0.0]
        let search_payload = SearchPayload {
            collection: "test_search".to_string(),
            vector: vec![1.0, 0.0],
            top_k: Some(2),
            score_threshold: None,
            offset: None,
            limit: None,
            filters: None,
        };

        let result = vector_search_points(tauri::State::from(state.clone()), search_payload);
        assert!(result.is_ok());
        let results = result.unwrap();
        assert_eq!(results.len(), 2);
        
        // Results should be ordered by score (highest first)
        assert_eq!(results[0].id, "point1"); // Should have higher similarity
        assert!(results[0].score > results[1].score);
        assert_eq!(results[1].id, "point2");
    }

    #[test]
    fn test_search_points_with_threshold() {
        let state = create_test_state();
        
        // Setup collection
        let payload = CreateCollectionPayload {
            name: "test_threshold".to_string(),
            dimension: 2,
            metadata: None,
            description: None,
            embedding_model: None,
            embedding_provider: None,
        };
        vector_create_collection(tauri::State::from(state.clone()), payload).unwrap();

        let points = vec![
            UpsertPoint {
                id: "high_sim".to_string(),
                vector: vec![1.0, 0.0],
                payload: None,
            },
            UpsertPoint {
                id: "low_sim".to_string(),
                vector: vec![0.0, 1.0],
                payload: None,
            },
        ];
        vector_upsert_points(tauri::State::from(state.clone()), "test_threshold".to_string(), points).unwrap();

        // Search with high threshold (should only return exact match)
        let search_payload = SearchPayload {
            collection: "test_threshold".to_string(),
            vector: vec![1.0, 0.0],
            top_k: Some(10),
            score_threshold: Some(0.99), // Very high threshold
            offset: None,
            limit: None,
            filters: None,
        };

        let result = vector_search_points(tauri::State::from(state.clone()), search_payload);
        assert!(result.is_ok());
        let results = result.unwrap();
        assert_eq!(results.len(), 1); // Should filter out low similarity result
        assert_eq!(results[0].id, "high_sim");
    }

    #[test]
    fn test_payload_filters() {
        let state = create_test_state();
        
        // Setup collection with diverse payload data
        let payload = CreateCollectionPayload {
            name: "test_filters".to_string(),
            dimension: 2,
            metadata: None,
            description: None,
            embedding_model: None,
            embedding_provider: None,
        };
        vector_create_collection(tauri::State::from(state.clone()), payload).unwrap();

        let points = vec![
            UpsertPoint {
                id: "doc1".to_string(),
                vector: vec![1.0, 0.0],
                payload: Some(json!({
                    "category": "science",
                    "title": "Physics Research",
                    "score": 95,
                    "published": true
                })),
            },
            UpsertPoint {
                id: "doc2".to_string(),
                vector: vec![0.9, 0.1],
                payload: Some(json!({
                    "category": "technology",
                    "title": "AI Development",
                    "score": 87,
                    "published": false
                })),
            },
            UpsertPoint {
                id: "doc3".to_string(),
                vector: vec![0.8, 0.2],
                payload: Some(json!({
                    "category": "science",
                    "title": "Chemistry Study",
                    "score": 92,
                    "published": true
                })),
            },
        ];
        vector_upsert_points(tauri::State::from(state.clone()), "test_filters".to_string(), points).unwrap();

        // Test equals filter
        let equals_filter = vec![PayloadFilter {
            key: "category".to_string(),
            value: json!("science"),
            operation: "equals".to_string(),
        }];
        
        let search_payload = SearchPayload {
            collection: "test_filters".to_string(),
            vector: vec![1.0, 0.0],
            top_k: Some(10),
            score_threshold: None,
            offset: None,
            limit: None,
            filters: Some(equals_filter),
        };

        let result = vector_search_points(tauri::State::from(state.clone()), search_payload);
        assert!(result.is_ok());
        let results = result.unwrap();
        assert_eq!(results.len(), 2); // Should only return science docs
        for result in &results {
            assert!(result.id == "doc1" || result.id == "doc3");
        }

        // Test contains filter
        let contains_filter = vec![PayloadFilter {
            key: "title".to_string(),
            value: json!("Research"),
            operation: "contains".to_string(),
        }];
        
        let search_payload = SearchPayload {
            collection: "test_filters".to_string(),
            vector: vec![1.0, 0.0],
            top_k: Some(10),
            score_threshold: None,
            offset: None,
            limit: None,
            filters: Some(contains_filter),
        };

        let result = vector_search_points(tauri::State::from(state.clone()), search_payload);
        assert!(result.is_ok());
        let results = result.unwrap();
        assert_eq!(results.len(), 1); // Should only return doc with "Research" in title
        assert_eq!(results[0].id, "doc1");

        // Test greater_than filter
        let gt_filter = vec![PayloadFilter {
            key: "score".to_string(),
            value: json!(90),
            operation: "greater_than".to_string(),
        }];
        
        let search_payload = SearchPayload {
            collection: "test_filters".to_string(),
            vector: vec![1.0, 0.0],
            top_k: Some(10),
            score_threshold: None,
            offset: None,
            limit: None,
            filters: Some(gt_filter),
        };

        let result = vector_search_points(tauri::State::from(state.clone()), search_payload);
        assert!(result.is_ok());
        let results = result.unwrap();
        assert_eq!(results.len(), 2); // doc1 (95) and doc3 (92)
        
        // Test multiple filters (AND logic)
        let multiple_filters = vec![
            PayloadFilter {
                key: "category".to_string(),
                value: json!("science"),
                operation: "equals".to_string(),
            },
            PayloadFilter {
                key: "score".to_string(),
                value: json!(93),
                operation: "greater_than".to_string(),
            },
        ];
        
        let search_payload = SearchPayload {
            collection: "test_filters".to_string(),
            vector: vec![1.0, 0.0],
            top_k: Some(10),
            score_threshold: None,
            offset: None,
            limit: None,
            filters: Some(multiple_filters),
        };

        let result = vector_search_points(tauri::State::from(state.clone()), search_payload);
        assert!(result.is_ok());
        let results = result.unwrap();
        assert_eq!(results.len(), 1); // Only doc1 matches both filters
        assert_eq!(results[0].id, "doc1");
    }

    #[test]
    fn test_pagination() {
        let state = create_test_state();
        
        // Setup collection with multiple points
        let payload = CreateCollectionPayload {
            name: "test_pagination".to_string(),
            dimension: 1,
            metadata: None,
            description: None,
            embedding_model: None,
            embedding_provider: None,
        };
        vector_create_collection(tauri::State::from(state.clone()), payload).unwrap();

        // Add 5 points with decreasing similarity to [1.0]
        let points: Vec<UpsertPoint> = (0..5).map(|i| {
            UpsertPoint {
                id: format!("point{}", i),
                vector: vec![1.0 - (i as f64 * 0.1)], // 1.0, 0.9, 0.8, 0.7, 0.6
                payload: Some(json!({"index": i})),
            }
        }).collect();
        vector_upsert_points(tauri::State::from(state.clone()), "test_pagination".to_string(), points).unwrap();

        // Test offset/limit pagination
        let search_payload = SearchPayload {
            collection: "test_pagination".to_string(),
            vector: vec![1.0],
            top_k: Some(10), // Request more than limit
            score_threshold: None,
            offset: Some(1), // Skip first result
            limit: Some(2), // Take next 2
            filters: None,
        };

        let result = vector_search_points(tauri::State::from(state.clone()), search_payload);
        assert!(result.is_ok());
        let results = result.unwrap();
        assert_eq!(results.len(), 2); // Should return exactly 2 results
        assert_eq!(results[0].id, "point1"); // Second highest similarity
        assert_eq!(results[1].id, "point2"); // Third highest similarity

        // Test offset beyond results
        let search_payload = SearchPayload {
            collection: "test_pagination".to_string(),
            vector: vec![1.0],
            top_k: Some(10),
            score_threshold: None,
            offset: Some(10), // Beyond available results
            limit: Some(5),
            filters: None,
        };

        let result = vector_search_points(tauri::State::from(state.clone()), search_payload);
        assert!(result.is_ok());
        let results = result.unwrap();
        assert_eq!(results.len(), 0); // Should return empty results
    }

    #[test]
    fn test_matches_filter_function() {
        // Test equals operation
        let filter = PayloadFilter {
            key: "test".to_string(),
            value: json!("hello"),
            operation: "equals".to_string(),
        };
        assert!(matches_filter(&json!("hello"), &filter));
        assert!(!matches_filter(&json!("world"), &filter));

        // Test contains operation
        let filter = PayloadFilter {
            key: "test".to_string(),
            value: json!("ell"),
            operation: "contains".to_string(),
        };
        assert!(matches_filter(&json!("hello"), &filter));
        assert!(!matches_filter(&json!("world"), &filter));

        // Test greater_than operation
        let filter = PayloadFilter {
            key: "test".to_string(),
            value: json!(5),
            operation: "greater_than".to_string(),
        };
        assert!(matches_filter(&json!(10), &filter));
        assert!(!matches_filter(&json!(3), &filter));

        // Test less_than operation
        let filter = PayloadFilter {
            key: "test".to_string(),
            value: json!(5),
            operation: "less_than".to_string(),
        };
        assert!(matches_filter(&json!(3), &filter));
        assert!(!matches_filter(&json!(10), &filter));

        // Test invalid operation
        let filter = PayloadFilter {
            key: "test".to_string(),
            value: json!("test"),
            operation: "invalid".to_string(),
        };
        assert!(!matches_filter(&json!("test"), &filter));
    }

    #[test]
    fn test_search_nonexistent_collection() {
        let state = create_test_state();
        
        let search_payload = SearchPayload {
            collection: "nonexistent".to_string(),
            vector: vec![1.0, 0.0],
            top_k: Some(5),
            score_threshold: None,
            offset: None,
            limit: None,
            filters: None,
        };

        let result = vector_search_points(tauri::State::from(state.clone()), search_payload);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("not found"));
    }

    #[test]
    fn test_export_collection() {
        let state = create_test_state();
        
        // Create collection with metadata
        let payload = CreateCollectionPayload {
            name: "test_export".to_string(),
            dimension: 3,
            metadata: Some(json!({"source": "test"})),
            description: Some("Export test collection".to_string()),
            embedding_model: Some("test-model".to_string()),
            embedding_provider: Some("test-provider".to_string()),
        };
        vector_create_collection(tauri::State::from(state.clone()), payload).unwrap();

        // Add some points
        let points = vec![
            UpsertPoint {
                id: "export1".to_string(),
                vector: vec![0.1, 0.2, 0.3],
                payload: Some(json!({"type": "document", "score": 85})),
            },
            UpsertPoint {
                id: "export2".to_string(),
                vector: vec![0.4, 0.5, 0.6],
                payload: Some(json!({"type": "article", "score": 92})),
            },
        ];
        vector_upsert_points(tauri::State::from(state.clone()), "test_export".to_string(), points).unwrap();

        // Export the collection
        let result = vector_export_collection(tauri::State::from(state.clone()), "test_export".to_string());
        assert!(result.is_ok());
        let exported = result.unwrap();

        // Verify export structure
        assert_eq!(exported.meta.name, "test_export");
        assert_eq!(exported.meta.dimension, 3);
        assert_eq!(exported.meta.description, Some("Export test collection".to_string()));
        assert_eq!(exported.meta.embedding_model, Some("test-model".to_string()));
        assert_eq!(exported.meta.embedding_provider, Some("test-provider".to_string()));
        assert_eq!(exported.meta.document_count, 2);
        assert_eq!(exported.points.len(), 2);
        
        // Verify points in export
        let point1 = exported.points.iter().find(|p| p.id == "export1").unwrap();
        assert_eq!(point1.vector, vec![0.1, 0.2, 0.3]);
        assert_eq!(point1.payload.as_ref().unwrap()["type"], "document");
        assert_eq!(point1.payload.as_ref().unwrap()["score"], 85);

        let point2 = exported.points.iter().find(|p| p.id == "export2").unwrap();
        assert_eq!(point2.vector, vec![0.4, 0.5, 0.6]);
        assert_eq!(point2.payload.as_ref().unwrap()["type"], "article");
        assert_eq!(point2.payload.as_ref().unwrap()["score"], 92);
    }

    #[test]
    fn test_export_nonexistent_collection() {
        let state = create_test_state();
        
        let result = vector_export_collection(tauri::State::from(state.clone()), "nonexistent".to_string());
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("not found"));
    }

    #[test]
    fn test_export_empty_collection() {
        let state = create_test_state();
        
        // Create empty collection
        let payload = CreateCollectionPayload {
            name: "empty_export".to_string(),
            dimension: 2,
            metadata: None,
            description: None,
            embedding_model: None,
            embedding_provider: None,
        };
        vector_create_collection(tauri::State::from(state.clone()), payload).unwrap();

        // Export empty collection
        let result = vector_export_collection(tauri::State::from(state.clone()), "empty_export".to_string());
        assert!(result.is_ok());
        let exported = result.unwrap();
        
        assert_eq!(exported.meta.name, "empty_export");
        assert_eq!(exported.meta.document_count, 0);
        assert_eq!(exported.points.len(), 0);
    }

    #[test]
    fn test_import_collection_new() {
        let state = create_test_state();
        
        // Create import data
        let import_data = CollectionImport {
            meta: CollectionMeta {
                name: "imported_collection".to_string(),
                dimension: 2,
                metadata: Some(json!({"imported": true})),
                document_count: 2, // Will be updated during import
                created_at: 1600000000, // Will be updated
                updated_at: 1600000000, // Will be updated
                description: Some("Imported test collection".to_string()),
                embedding_model: Some("imported-model".to_string()),
                embedding_provider: Some("imported-provider".to_string()),
            },
            points: vec![
                PointRecord {
                    id: "imported1".to_string(),
                    vector: vec![0.7, 0.8],
                    payload: Some(json!({"imported": true, "id": 1})),
                },
                PointRecord {
                    id: "imported2".to_string(),
                    vector: vec![0.9, 0.1],
                    payload: Some(json!({"imported": true, "id": 2})),
                },
            ],
        };

        // Import collection
        let result = vector_import_collection(tauri::State::from(state.clone()), import_data, Some(false));
        assert!(result.is_ok());

        // Verify collection was imported
        let data = state.data.lock();
        assert!(data.collections.contains_key("imported_collection"));
        
        let collection = &data.collections["imported_collection"];
        assert_eq!(collection.name, "imported_collection");
        assert_eq!(collection.dimension, 2);
        assert_eq!(collection.description, Some("Imported test collection".to_string()));
        assert_eq!(collection.embedding_model, Some("imported-model".to_string()));
        assert_eq!(collection.embedding_provider, Some("imported-provider".to_string()));
        assert_eq!(collection.document_count, 2);
        
        // Verify points were imported
        assert_eq!(data.points["imported_collection"].len(), 2);
        let point1 = data.points["imported_collection"].iter().find(|p| p.id == "imported1").unwrap();
        assert_eq!(point1.vector, vec![0.7, 0.8]);
        assert_eq!(point1.payload.as_ref().unwrap()["imported"], true);
        assert_eq!(point1.payload.as_ref().unwrap()["id"], 1);
    }

    #[test]
    fn test_import_collection_overwrite() {
        let state = create_test_state();
        
        // Create existing collection
        let payload = CreateCollectionPayload {
            name: "existing_collection".to_string(),
            dimension: 3,
            metadata: Some(json!({"original": true})),
            description: Some("Original collection".to_string()),
            embedding_model: Some("original-model".to_string()),
            embedding_provider: Some("original-provider".to_string()),
        };
        vector_create_collection(tauri::State::from(state.clone()), payload).unwrap();

        // Add original points
        let original_points = vec![
            UpsertPoint {
                id: "original1".to_string(),
                vector: vec![1.0, 0.0, 0.0],
                payload: Some(json!({"original": true})),
            },
        ];
        vector_upsert_points(tauri::State::from(state.clone()), "existing_collection".to_string(), original_points).unwrap();

        // Try import without overwrite - should fail
        let import_data = CollectionImport {
            meta: CollectionMeta {
                name: "existing_collection".to_string(),
                dimension: 2,
                metadata: Some(json!({"imported": true})),
                document_count: 1,
                created_at: 1600000000,
                updated_at: 1600000000,
                description: Some("Imported collection".to_string()),
                embedding_model: Some("imported-model".to_string()),
                embedding_provider: Some("imported-provider".to_string()),
            },
            points: vec![
                PointRecord {
                    id: "imported1".to_string(),
                    vector: vec![0.5, 0.5],
                    payload: Some(json!({"imported": true})),
                },
            ],
        };

        let result = vector_import_collection(tauri::State::from(state.clone()), import_data.clone(), Some(false));
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("already exists"));

        // Import with overwrite - should succeed
        let result = vector_import_collection(tauri::State::from(state.clone()), import_data, Some(true));
        assert!(result.is_ok());

        // Verify collection was overwritten
        let data = state.data.lock();
        let collection = &data.collections["existing_collection"];
        assert_eq!(collection.dimension, 2); // Should be updated
        assert_eq!(collection.description, Some("Imported collection".to_string()));
        assert_eq!(collection.embedding_model, Some("imported-model".to_string()));
        assert_eq!(collection.document_count, 1);
        
        // Verify points were replaced
        assert_eq!(data.points["existing_collection"].len(), 1);
        let point = &data.points["existing_collection"][0];
        assert_eq!(point.id, "imported1");
        assert_eq!(point.vector, vec![0.5, 0.5]);
    }

    #[test]
    fn test_import_collection_preserves_created_at() {
        let state = create_test_state();
        
        // Import new collection
        let import_data = CollectionImport {
            meta: CollectionMeta {
                name: "new_import".to_string(),
                dimension: 1,
                metadata: None,
                document_count: 0,
                created_at: 1500000000, // Old timestamp
                updated_at: 1500000000, // Should be updated
                description: None,
                embedding_model: None,
                embedding_provider: None,
            },
            points: vec![],
        };

        let result = vector_import_collection(tauri::State::from(state.clone()), import_data, None);
        assert!(result.is_ok());

        // Verify timestamps
        let data = state.data.lock();
        let collection = &data.collections["new_import"];
        
        // created_at should be current time (new collection)
        let now = default_timestamp();
        assert!(collection.created_at >= now - 2 && collection.created_at <= now + 2);
        
        // updated_at should be current time
        assert!(collection.updated_at >= now - 2 && collection.updated_at <= now + 2);
    }

    #[test]
    fn test_import_empty_collection() {
        let state = create_test_state();
        
        let import_data = CollectionImport {
            meta: CollectionMeta {
                name: "empty_import".to_string(),
                dimension: 4,
                metadata: Some(json!({"empty": true})),
                document_count: 0,
                created_at: 1600000000,
                updated_at: 1600000000,
                description: Some("Empty imported collection".to_string()),
                embedding_model: Some("empty-model".to_string()),
                embedding_provider: Some("empty-provider".to_string()),
            },
            points: vec![],
        };

        let result = vector_import_collection(tauri::State::from(state.clone()), import_data, None);
        assert!(result.is_ok());

        // Verify empty collection was imported correctly
        let data = state.data.lock();
        assert!(data.collections.contains_key("empty_import"));
        
        let collection = &data.collections["empty_import"];
        assert_eq!(collection.document_count, 0);
        assert_eq!(collection.dimension, 4);
        
        assert_eq!(data.points["empty_import"].len(), 0);
    }

    #[test]
    fn test_round_trip_export_import() {
        let state = create_test_state();
        
        // Create original collection with complex data
        let payload = CreateCollectionPayload {
            name: "roundtrip_test".to_string(),
            dimension: 3,
            metadata: Some(json!({"test": "roundtrip", "version": 1.0})),
            description: Some("Round trip test collection".to_string()),
            embedding_model: Some("roundtrip-model".to_string()),
            embedding_provider: Some("roundtrip-provider".to_string()),
        };
        vector_create_collection(tauri::State::from(state.clone()), payload).unwrap();

        // Add complex points
        let points = vec![
            UpsertPoint {
                id: "complex1".to_string(),
                vector: vec![0.123456789, -0.987654321, 0.555555555],
                payload: Some(json!({
                    "text": "Hello, world! 🌍",
                    "metadata": {
                        "nested": {
                            "deep": "value",
                            "array": [1, 2, 3, "test"]
                        }
                    },
                    "numbers": [1.1, 2.2, 3.3],
                    "boolean": true,
                    "null_value": null
                })),
            },
            UpsertPoint {
                id: "complex2".to_string(),
                vector: vec![1.0, 0.0, -1.0],
                payload: Some(json!({
                    "unicode": "测试 🚀 émojis",
                    "special_chars": "\"quotes\" & <tags> & 'apostrophes'",
                    "large_number": 1234567890123456789i64
                })),
            },
        ];
        vector_upsert_points(tauri::State::from(state.clone()), "roundtrip_test".to_string(), points).unwrap();

        // Export the collection
        let export_result = vector_export_collection(tauri::State::from(state.clone()), "roundtrip_test".to_string());
        assert!(export_result.is_ok());
        let exported_data = export_result.unwrap();

        // Delete original collection
        vector_delete_collection(tauri::State::from(state.clone()), "roundtrip_test".to_string()).unwrap();

        // Verify deletion
        {
            let data = state.data.lock();
            assert!(!data.collections.contains_key("roundtrip_test"));
        }

        // Import the exported data
        let import_result = vector_import_collection(tauri::State::from(state.clone()), CollectionImport {
            meta: exported_data.meta,
            points: exported_data.points,
        }, None);
        assert!(import_result.is_ok());

        // Verify imported collection matches original
        let data = state.data.lock();
        assert!(data.collections.contains_key("roundtrip_test"));
        
        let collection = &data.collections["roundtrip_test"];
        assert_eq!(collection.name, "roundtrip_test");
        assert_eq!(collection.dimension, 3);
        assert_eq!(collection.description, Some("Round trip test collection".to_string()));
        assert_eq!(collection.embedding_model, Some("roundtrip-model".to_string()));
        assert_eq!(collection.embedding_provider, Some("roundtrip-provider".to_string()));
        assert_eq!(collection.document_count, 2);
        
        // Verify imported points
        assert_eq!(data.points["roundtrip_test"].len(), 2);
        
        let point1 = data.points["roundtrip_test"].iter().find(|p| p.id == "complex1").unwrap();
        assert_eq!(point1.vector, vec![0.123456789, -0.987654321, 0.555555555]);
        assert_eq!(point1.payload.as_ref().unwrap()["text"], "Hello, world! 🌍");
        assert_eq!(point1.payload.as_ref().unwrap()["metadata"]["nested"]["deep"], "value");
        assert_eq!(point1.payload.as_ref().unwrap()["boolean"], true);
        
        let point2 = data.points["roundtrip_test"].iter().find(|p| p.id == "complex2").unwrap();
        assert_eq!(point2.vector, vec![1.0, 0.0, -1.0]);
        assert_eq!(point2.payload.as_ref().unwrap()["unicode"], "测试 🚀 émojis");
        assert_eq!(point2.payload.as_ref().unwrap()["special_chars"], "\"quotes\" & <tags> & 'apostrophes'");
    }
}
